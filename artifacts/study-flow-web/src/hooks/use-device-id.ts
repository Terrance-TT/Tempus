import { useUser } from "@clerk/react";

const GUEST_ID_KEY = "studyflow_guest_device_id";
const PENDING_SCHEDULE_KEY = "studyflow_pending_schedule_id";

/**
 * Lazily creates (and persists) a random guest device id in localStorage.
 * Guests can build commitments/schedules under this id; after signing in,
 * the server's /claim-guest-data endpoint reassigns that data to the
 * Clerk user id.
 */
export function getGuestDeviceId(): string {
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = `guest-${crypto.randomUUID()}`;
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

/** Returns the guest id if one exists, without creating one. */
export function peekGuestDeviceId(): string | null {
  return localStorage.getItem(GUEST_ID_KEY);
}

export function clearGuestDeviceId() {
  localStorage.removeItem(GUEST_ID_KEY);
}

export function setPendingScheduleId(id: string) {
  localStorage.setItem(PENDING_SCHEDULE_KEY, id);
}

export function getPendingScheduleId(): string | null {
  return localStorage.getItem(PENDING_SCHEDULE_KEY);
}

export function clearPendingScheduleId() {
  localStorage.removeItem(PENDING_SCHEDULE_KEY);
}

/**
 * Returns the id used to scope a user's commitments/schedules on the web app.
 *
 * Signed-in users resolve to their Clerk user id (the server independently
 * re-derives and enforces this from the session — see api-server's
 * resolveOwnerId). Signed-out visitors get a persistent random guest id so
 * they can try the app before creating an account; their data is claimed
 * into their real account after sign-in.
 */
export function useDeviceId() {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return null;
  return user?.id ?? getGuestDeviceId();
}

/** Whether the current visitor is signed in (null while Clerk loads). */
export function useIsSignedIn(): boolean | null {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return null;
  return !!user;
}
