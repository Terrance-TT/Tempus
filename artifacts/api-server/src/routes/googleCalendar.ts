import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { and, eq } from "drizzle-orm";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  db,
  schedules,
  googleCalendarConnections,
  scheduleCalendarSyncs,
} from "@workspace/db";
import {
  SyncScheduleToGoogleCalendarParams,
  SyncScheduleToGoogleCalendarBody,
} from "@workspace/api-zod";
import {
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  getValidAccessToken,
  insertCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  buildEventBody,
  GoogleReauthRequiredError,
} from "../lib/googleCalendar";

const router: IRouter = Router();

type ScheduleBlock = {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  title: string;
  category: string;
  notes?: string | null;
};

// The OAuth `state` param must be an unguessable, tamper-proof, single-use
// token bound to the signed-in user who initiated the connect flow. Without
// this, an attacker can perform "login/account-link CSRF": craft their own
// authorization code exchange and trick a victim's browser into completing
// it, attaching the attacker's Google account to the victim's Tempus
// account. We sign {userId, nonce, expiresAt, returnTo} with a server-only
// secret and require, on callback, that the signature is valid, the state
// hasn't expired, the nonce hasn't been used before, and the userId in the
// state matches the currently authenticated Clerk session.
const usedStateNonces = new Set<string>();

function getStateSecret(): string {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    throw new Error("CLERK_SECRET_KEY is required to sign Google OAuth state");
  }
  return secret;
}

function signStatePayload(payload: string): string {
  return createHmac("sha256", getStateSecret()).update(payload).digest("base64url");
}

function encodeState(data: { userId: string; returnTo: string }): string {
  const payload = JSON.stringify({
    userId: data.userId,
    returnTo: data.returnTo,
    nonce: randomBytes(16).toString("base64url"),
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const signature = signStatePayload(payloadB64);
  return `${payloadB64}.${signature}`;
}

function decodeAndVerifyState(
  state: unknown,
  currentUserId: string | null | undefined,
): { returnTo: string } | { error: "invalid" | "expired" | "reused" | "user_mismatch" } {
  if (typeof state !== "string" || !state) return { error: "invalid" };
  const [payloadB64, signature] = state.split(".");
  if (!payloadB64 || !signature) return { error: "invalid" };

  const expectedSignature = signStatePayload(payloadB64);
  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (
    signatureBuf.length !== expectedBuf.length ||
    !timingSafeEqual(signatureBuf, expectedBuf)
  ) {
    return { error: "invalid" };
  }

  let parsed: { userId?: unknown; returnTo?: unknown; nonce?: unknown; expiresAt?: unknown };
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return { error: "invalid" };
  }

  if (
    typeof parsed.userId !== "string" ||
    typeof parsed.returnTo !== "string" ||
    !parsed.returnTo.startsWith("/") ||
    typeof parsed.nonce !== "string" ||
    typeof parsed.expiresAt !== "number"
  ) {
    return { error: "invalid" };
  }

  if (Date.now() > parsed.expiresAt) return { error: "expired" };
  if (usedStateNonces.has(parsed.nonce)) return { error: "reused" };
  if (!currentUserId || parsed.userId !== currentUserId) return { error: "user_mismatch" };

  usedStateNonces.add(parsed.nonce);
  return { returnTo: parsed.returnTo };
}

router.get("/google-calendar/status", async (req, res) => {
  const userId = getAuth(req)?.userId;
  if (!userId) {
    res.json({ connected: false });
    return;
  }
  const [connection] = await db
    .select()
    .from(googleCalendarConnections)
    .where(eq(googleCalendarConnections.ownerId, userId));
  res.json({ connected: Boolean(connection) });
});

router.get("/google-calendar/connect", async (req, res) => {
  const userId = getAuth(req)?.userId;
  if (!userId) {
    res.status(401).json({ message: "Sign in required" });
    return;
  }
  const returnTo =
    typeof req.query.returnTo === "string" && req.query.returnTo.startsWith("/")
      ? req.query.returnTo
      : "/web/";
  const state = encodeState({ userId, returnTo });
  res.redirect(buildGoogleAuthUrl(req, state));
});

router.get("/google-calendar/callback", async (req, res) => {
  const userId = getAuth(req)?.userId;
  const verified = decodeAndVerifyState(req.query.state, userId);

  if ("error" in verified) {
    // We can't trust any returnTo from an unverified state, so fall back to
    // the app root rather than redirecting using attacker-controlled data.
    const fallbackReturnTo = "/web/";
    const errorCode = !userId ? "not_signed_in" : verified.error;
    res.redirect(`${fallbackReturnTo}?googleCalendarError=${errorCode}`);
    return;
  }

  const { returnTo } = verified;
  if (!userId) {
    // Unreachable in practice (decodeAndVerifyState already requires userId
    // to match the state's userId), but keeps ownership below type-safe.
    res.redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}googleCalendarError=not_signed_in`);
    return;
  }
  const code = typeof req.query.code === "string" ? req.query.code : null;
  if (!code) {
    res.redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}googleCalendarError=denied`);
    return;
  }

  try {
    const tokens = await exchangeCodeForTokens(req, code);
    if (!tokens.refresh_token) {
      // Google only returns a refresh_token the first time a user consents
      // (or when prompt=consent forces re-consent, which we always request).
      // If it's still missing, treat it as a failure rather than silently
      // storing a connection with no way to refresh future access tokens.
      res.redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}googleCalendarError=no_refresh_token`);
      return;
    }
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await db
      .insert(googleCalendarConnections)
      .values({
        ownerId: userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: googleCalendarConnections.ownerId,
        set: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt,
          updatedAt: new Date(),
        },
      });

    res.redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}googleCalendarConnected=1`);
  } catch (err) {
    req.log?.error({ err }, "Google Calendar OAuth callback failed");
    res.redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}googleCalendarError=exchange_failed`);
  }
});

router.get("/schedules/:id/calendar-syncs", async (req, res) => {
  const userId = getAuth(req)?.userId;
  if (!userId) {
    res.status(401).json({ message: "Sign in required" });
    return;
  }
  const { id } = SyncScheduleToGoogleCalendarParams.parse(req.params);
  const [schedule] = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.id, id), eq(schedules.deviceId, userId)));
  if (!schedule) {
    res.status(404).json({ message: "Schedule not found" });
    return;
  }
  const syncs = await db
    .select()
    .from(scheduleCalendarSyncs)
    .where(eq(scheduleCalendarSyncs.scheduleId, id));
  res.json(
    syncs.map((s) => ({
      blockId: s.blockId,
      googleEventId: s.googleEventId,
      createdAt: s.createdAt.toISOString(),
    })),
  );
});

router.post("/schedules/:id/sync-google-calendar", async (req, res) => {
  const userId = getAuth(req)?.userId;
  if (!userId) {
    res.status(401).json({ message: "Sign in with Google required to sync your calendar" });
    return;
  }

  const { id } = SyncScheduleToGoogleCalendarParams.parse(req.params);
  const { timeZone } = SyncScheduleToGoogleCalendarBody.parse(req.body);

  const [schedule] = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.id, id), eq(schedules.deviceId, userId)));
  if (!schedule) {
    res.status(404).json({ message: "Schedule not found" });
    return;
  }

  const [connection] = await db
    .select()
    .from(googleCalendarConnections)
    .where(eq(googleCalendarConnections.ownerId, userId));
  if (!connection) {
    res.status(409).json({ message: "Google Calendar not connected", needsConnect: true });
    return;
  }

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(connection);
  } catch (err) {
    if (err instanceof GoogleReauthRequiredError) {
      await db
        .delete(googleCalendarConnections)
        .where(eq(googleCalendarConnections.id, connection.id));
      res.status(409).json({ message: "Google Calendar connection expired, please reconnect", needsConnect: true });
      return;
    }
    throw err;
  }

  const blocks = schedule.blocks as ScheduleBlock[];
  const scope = schedule.scope as "day" | "week";
  const currentBlockIds = new Set(blocks.map((b) => b.id));

  const existingSyncs = await db
    .select()
    .from(scheduleCalendarSyncs)
    .where(eq(scheduleCalendarSyncs.scheduleId, id));
  const syncByBlockId = new Map(existingSyncs.map((s) => [s.blockId, s]));

  // Remove events for blocks that no longer exist (e.g. after an edit/revise
  // regenerated the schedule's block ids), so re-syncing never leaves stale
  // duplicate events behind.
  for (const sync of existingSyncs) {
    if (!currentBlockIds.has(sync.blockId)) {
      await deleteCalendarEvent(accessToken, sync.googleEventId);
      await db.delete(scheduleCalendarSyncs).where(eq(scheduleCalendarSyncs.id, sync.id));
    }
  }

  let syncedCount = 0;
  for (const block of blocks) {
    const eventBody = buildEventBody(block, scope, timeZone);
    const existingSync = syncByBlockId.get(block.id);

    if (existingSync) {
      const updated = await updateCalendarEvent(accessToken, existingSync.googleEventId, eventBody);
      if (updated.id !== existingSync.googleEventId) {
        await db
          .update(scheduleCalendarSyncs)
          .set({ googleEventId: updated.id })
          .where(eq(scheduleCalendarSyncs.id, existingSync.id));
      }
    } else {
      const created = await insertCalendarEvent(accessToken, eventBody);
      await db.insert(scheduleCalendarSyncs).values({
        scheduleId: id,
        blockId: block.id,
        googleEventId: created.id,
      });
    }
    syncedCount++;
  }

  res.json({ syncedCount, calendarUrl: "https://calendar.google.com/calendar/r" });
});

export default router;
