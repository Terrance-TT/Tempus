---
name: Shared api-server device-scoped write routes
description: Ownership + scope rules for write routes on the shared api-server used by both StudyFlow web and mobile
---

# Device-scoped write routes on the shared api-server

The `artifacts/api-server` backend is multi-tenant by `deviceId` (no auth; the
device UUID from localStorage / mobile storage is the tenant key). Both the web
(`study-flow-web`) and mobile (`study-flow`) apps share it.

## Rules

- **Every write/mutation route that targets a specific row MUST scope its DB
  lookup by `deviceId` as well as the row id** (e.g.
  `and(eq(schedules.id, id), eq(schedules.deviceId, body.deviceId))`), and return
  404 when no row matches. Looking up by id alone lets anyone with a UUID
  overwrite another device's data.
  **Why:** a PATCH route was added that keyed only on id and allowed cross-device
  overwrite. Mirror the ownership check that read/list/revise routes already use.
  **How to apply:** when adding/editing any PATCH/PUT/DELETE/POST that mutates an
  existing row, include `deviceId` in the schema as required and in the WHERE.

- **Draft/multi-step generation must use the PERSISTED value, not the
  client-resubmitted one, for fields fixed at draft creation** (e.g. schedule
  `scope`). On a draft-continuation call, read scope from the stored draft row;
  do not trust `body.scope`, or blocks and the stored/returned scope can diverge.

## Backward compatibility

- Mobile and web share the spec/codegen (`lib/api-spec/openapi.yaml` ->
  `pnpm --filter @workspace/api-spec run codegen`). New fields on existing
  request bodies must be **optional** so mobile keeps compiling/working. Adding a
  *new required* field to an existing input (as done for `UpdateScheduleInput.deviceId`)
  requires updating every caller of that hook in BOTH apps.
