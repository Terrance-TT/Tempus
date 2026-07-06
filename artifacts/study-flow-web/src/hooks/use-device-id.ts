import { useUser } from "@clerk/react";

/**
 * Returns the id used to scope a user's commitments/schedules on the web app.
 *
 * The web app requires Google sign-in, so this always resolves to the
 * signed-in Clerk user's id (the server also independently re-derives and
 * enforces this from the session — see api-server's resolveOwnerId — so
 * this value is really just used to gate queries on the client while the
 * session loads). Named `useDeviceId` for backward compatibility with
 * existing page code; conceptually it now returns the owner id.
 */
export function useDeviceId() {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return null;
  return user?.id ?? null;
}
