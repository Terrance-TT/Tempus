import { Router, type IRouter, type Request } from "express";
import { randomBytes } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { db, extensionTokens, focusGuardUsage, schedules, type ExtensionToken } from "@workspace/db";
import { z } from "zod/v4";
import { resolveOwnerId } from "../lib/auth";
import { CreateExtensionTokenBody } from "@workspace/api-zod";
import { loadFocusGuardSettings, normalizeDomain } from "./focusGuard";

const router: IRouter = Router();

/** Resolve the extension token row from a Bearer authorization header. */
async function authenticateExtension(req: Request): Promise<ExtensionToken | null> {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  const [row] = await db
    .select()
    .from(extensionTokens)
    .where(eq(extensionTokens.token, token))
    .limit(1);
  return row ?? null;
}

async function loadLatestScheduleBlocks(ownerId: string) {
  const rows = await db
    .select()
    .from(schedules)
    .where(eq(schedules.deviceId, ownerId))
    .orderBy(desc(schedules.createdAt));
  const active = rows.find((s) => s.status === "complete");
  return active ? { hasSchedule: true as const, blocks: active.blocks } : { hasSchedule: false as const, blocks: [] };
}

/**
 * Create (or return the existing) connection token that the Focus Guard
 * browser extension uses to read this user's schedule. The token is an
 * opaque random secret scoped to the resolved owner (Clerk user id when
 * signed in, guest device id otherwise) — the same scoping rule every
 * other schedules endpoint uses.
 */
router.post("/extension/token", async (req, res) => {
  const { deviceId, rotate } = CreateExtensionTokenBody.parse(req.body);
  const ownerId = resolveOwnerId(req, deviceId);

  const [existing] = await db
    .select()
    .from(extensionTokens)
    .where(eq(extensionTokens.ownerId, ownerId))
    .limit(1);

  // Without `rotate`, this is get-or-create. With `rotate`, the old token is
  // invalidated and a fresh one issued (revocation path for leaked codes).
  if (existing && !rotate) {
    res.json({ token: existing.token });
    return;
  }

  const token = `tfx_${randomBytes(24).toString("base64url")}`;
  if (existing) {
    await db
      .update(extensionTokens)
      .set({ token })
      .where(eq(extensionTokens.ownerId, ownerId));
  } else {
    await db.insert(extensionTokens).values({ token, ownerId });
  }
  res.json({ token });
});

/**
 * Called by the browser extension (Bearer token auth — no cookies, no Clerk
 * session). Returns the latest complete schedule's blocks so the extension
 * can decide when a focus block is active.
 */
router.get("/extension/schedule", async (req, res) => {
  const row = await authenticateExtension(req);
  if (!row) {
    res.status(401).json({ error: "Invalid or missing bearer token" });
    return;
  }
  const schedule = await loadLatestScheduleBlocks(row.ownerId);
  res.json(schedule);
});

/**
 * Single config endpoint for the redesigned extension: the user's Focus
 * Guard settings (blocklist, mode, clock visibility — all managed on the
 * website) plus the latest schedule blocks in one round trip.
 */
router.get("/extension/config", async (req, res) => {
  const row = await authenticateExtension(req);
  if (!row) {
    res.status(401).json({ error: "Invalid or missing bearer token" });
    return;
  }
  const [settings, schedule] = await Promise.all([
    loadFocusGuardSettings(row.ownerId),
    loadLatestScheduleBlocks(row.ownerId),
  ]);
  res.json({ settings, ...schedule });
});

const UsageReportBody = z.object({
  entries: z
    .array(
      z.object({
        domain: z.string().min(1).max(300),
        day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        seconds: z.number().int().min(1).max(24 * 60 * 60),
      }),
    )
    .max(200),
});

/**
 * Usage ingestion for Pro analytics. The extension batches per-domain active
 * time and flushes periodically; rows are upserted per (owner, domain, day).
 */
router.post("/extension/usage", async (req, res) => {
  const row = await authenticateExtension(req);
  if (!row) {
    res.status(401).json({ error: "Invalid or missing bearer token" });
    return;
  }

  const { entries } = UsageReportBody.parse(req.body);
  for (const entry of entries) {
    const domain = normalizeDomain(entry.domain);
    if (!domain) continue;
    await db
      .insert(focusGuardUsage)
      .values({ ownerId: row.ownerId, domain, day: entry.day, seconds: entry.seconds })
      .onConflictDoUpdate({
        target: [focusGuardUsage.ownerId, focusGuardUsage.domain, focusGuardUsage.day],
        set: { seconds: sql`${focusGuardUsage.seconds} + ${entry.seconds}` },
      });
  }
  res.json({ ok: true });
});

export default router;
