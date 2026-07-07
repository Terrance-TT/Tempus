import { Router, type IRouter } from "express";
import { randomBytes } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db, extensionTokens, schedules } from "@workspace/db";
import { resolveOwnerId } from "../lib/auth";
import { CreateExtensionTokenBody } from "@workspace/api-zod";

const router: IRouter = Router();

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
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  const [row] = await db
    .select()
    .from(extensionTokens)
    .where(eq(extensionTokens.token, token))
    .limit(1);
  if (!row) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  // Newest complete schedule wins — drafts awaiting clarification are skipped.
  const rows = await db
    .select()
    .from(schedules)
    .where(eq(schedules.deviceId, row.ownerId))
    .orderBy(desc(schedules.createdAt));
  const active = rows.find((s) => s.status === "complete");

  if (!active) {
    res.json({ hasSchedule: false, blocks: [] });
    return;
  }

  res.json({
    hasSchedule: true,
    scheduleId: active.id,
    createdAt: active.createdAt.toISOString(),
    blocks: active.blocks,
  });
});

export default router;
