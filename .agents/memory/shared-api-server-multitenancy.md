---
name: Shared api-server device-scoped write routes
description: Ownership + scope rules for routes on the shared api-server used by both StudyFlow web and mobile
---

# Device-scoped routes on the shared api-server

The `artifacts/api-server` backend is multi-tenant by `deviceId` with no auth: the
device UUID (localStorage on web, device storage on mobile) is the tenant key.
Both the web (`study-flow-web`) and mobile (`study-flow`) apps share it.

## Rules

- **Every route that reads, mutates, or deletes a specific row MUST scope the DB
  query by `deviceId` in addition to the row id, and return 404 on mismatch.**
  Keying by id alone is an IDOR: anyone with a row UUID can read/overwrite/delete
  another device's data. This applies to GET/PATCH/PUT/DELETE/POST alike — a
  pre-check select is not enough on its own; scope the actual write too.
  **Why:** several routes shipped keyed on id only and allowed cross-device access.
  **How to apply:** require `deviceId` in the route (query param for GET/DELETE,
  body field for PATCH/POST) and include it in the WHERE of the real operation.

- **Draft/multi-step generation must use the PERSISTED value, not the
  client-resubmitted one, for fields fixed at draft creation** (e.g. schedule
  scope). Trusting the resubmitted value lets stored data and output diverge.

## Backward compatibility

- Web and mobile share the spec/codegen (`lib/api-spec/openapi.yaml`). New fields
  on existing request bodies should be **optional** so mobile keeps working.
  Making a field **required** (or adding a required query param) is a breaking
  change: you must update every caller of that hook in BOTH apps in the same change.

## orval barrel gotcha

- A route with BOTH a path param and a query param makes orval emit a zod
  path-param const and a generated query-param TYPE that share the
  `<Operation>Params` name, colliding in the `@workspace/api-zod` barrel
  (TS2308). Resolve by explicitly re-exporting the zod versions after the star
  exports in that package's index so the schemas the server validates with win.

## Migrating device-scoped ownership to real user accounts (Clerk) without breaking mobile

- Add a `resolveOwnerId(req, providedDeviceId)` helper used by every route instead
  of reading `deviceId` directly: it returns the Clerk session `userId` when signed
  in (web), otherwise falls back to the client-supplied `deviceId` (mobile / signed-out
  web). No DB/schema changes needed — the existing `deviceId` text column just also
  holds Clerk user ids for signed-in rows.
  **Why:** lets web migrate to real accounts while the mobile app's anonymous
  deviceId flow keeps working completely untouched, and prevents a signed-in user
  from spoofing another user's rows by tampering with the deviceId field.
  **How to apply:** any new ownership/auth migration on a shared multi-tenant
  backend should use this session-override pattern rather than a hard cutover.

- Clerk's SDK (as installed) has no API to request additional OAuth scopes (e.g.
  Google Calendar) beyond what's needed for login — verified by grepping node_modules
  `.d.ts` for `additionalOAuthScopes`/`createExternalAccount`. If a feature needs an
  extra OAuth scope Clerk doesn't expose, set up a **separate**, purpose-specific
  OAuth app (own client id/secret, own connect/callback routes, own token storage
  table) rather than trying to extend the Clerk connection.

- The `resolveOwnerId` session-override pattern has a spoofing gap: an unauthenticated
  caller who merely knows another user's Clerk id can pass it as `deviceId` and read/write
  that account's rows, since the fallback path doesn't require a session. Close it by
  detecting the auth provider's id shape (e.g. Clerk ids start with `user_`) and rebinding
  any unauthenticated request using that shape to a fresh random id instead of trusting it.
  **Why:** real anonymous device ids are generated client-side and never take the auth
  provider's id shape, so this only ever blocks spoofing attempts, never legitimate traffic.
