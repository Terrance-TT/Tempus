import { getAuth } from "@clerk/express";
import type { Request } from "express";

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
 */
export function resolveOwnerId(req: Request, providedDeviceId: string): string {
  const auth = getAuth(req);
  return auth?.userId ?? providedDeviceId;
}
