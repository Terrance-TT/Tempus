import { getAuth } from "@clerk/express";
import type { Request } from "express";
import { randomUUID } from "node:crypto";

// Clerk user ids always take the form "user_<random>". Real mobile/anonymous
// deviceIds are generated client-side (see artifacts/study-flow's
// useDeviceId.ts and study-flow-web's device id generation) and never take
// this shape. This lets us detect and reject attempts to read/write
// account-owned rows by guessing/replaying a Clerk userId as a deviceId
// without an authenticated session.
const CLERK_USER_ID_PATTERN = /^user_/;

/**
 * Resolves the effective tenant/owner id used to scope commitments and
 * schedules rows.
 *
 * - Web (signed in via Clerk): the Clerk session's userId always wins, even
 *   if the client also sent a deviceId — this prevents a signed-in user from
 *   spoofing another user's rows by tampering with the deviceId field.
 * - Mobile (no Clerk session, e.g. Expo app) and signed-out web visitors:
 *   fall back to the client-supplied deviceId, exactly as before Clerk was
 *   introduced. This keeps the mobile app's existing deviceId-based flow
 *   completely unaffected.
 * - Unauthenticated requests that supply a deviceId shaped like a Clerk user
 *   id are never trusted — that would let someone who merely knows (or
 *   guesses) another user's Clerk id read or write that user's account-owned
 *   rows without ever signing in. Such requests are rebound to a fresh
 *   random id that cannot match any stored row, so they see/affect nothing.
 */
export function resolveOwnerId(req: Request, providedDeviceId: string): string {
  const auth = getAuth(req);
  if (auth?.userId) return auth.userId;
  if (CLERK_USER_ID_PATTERN.test(providedDeviceId)) return randomUUID();
  return providedDeviceId;
}
