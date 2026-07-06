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
