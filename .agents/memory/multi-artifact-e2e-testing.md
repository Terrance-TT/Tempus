---
name: Multi-artifact e2e testing with runTest
description: How to target the right artifact and seed owner-scoped test data when a project has multiple path-routed artifacts sharing one backend
---

# Testing a specific artifact in a multi-artifact project

- `runTest`'s `path:` browser directive is NOT automatically scoped to one
  artifact when the project has several path-routed artifacts (e.g. a web app
  at `/web` and an Expo app served under its own path/domain). Given a bare
  path like `/`, the test agent can land on the wrong artifact (observed:
  it hit the Expo mobile app's onboarding screen instead of the React web app).
  **Why:** there's no implicit "current artifact" context passed to the test
  plan; it just navigates to whatever resolves first.
  **How to apply:** always include the artifact's own preview path prefix in
  every `[Browser]` path in the test plan (e.g. `/web/`, `/web/schedule/:id`),
  and add an explicit note at the top of the test plan naming the target
  artifact and telling the agent not to test other artifacts in the project.

# Transient mid-test workflow restarts cause false failures

- Workflows in this project sometimes restart while a `runTest` run is in
  flight, killing in-flight API requests. On the Expo app this leaves screens
  stuck on a spinner (react-query exhausts retries, no auto-refetch), which the
  tester reports as a rendering bug even though the code is fine.
  **How to apply:** before concluding a UI bug from a failed run, check whether
  the api-server log shows a fresh "Server listening" during the test window;
  include a test-plan instruction to reload the page if it spins >10s, and note
  that the RNW "indexed property on CSSStyleDeclaration" console error is a
  known transient that the ErrorBoundary auto-recovers (don't fail on it).

# Seeding DB rows owned by a real signed-in (Clerk) user in a test

- There's usually no local table mapping Clerk user id <-> email, so a `[DB]`
  step can't look up "the id of the user I just signed in as" directly.
  **How to apply:** first do a `[API]` step that creates some owner-scoped row
  through an authenticated same-origin endpoint (any POST that echoes the
  resolved owner id back in its response body works, e.g. a "create commitment"
  style endpoint) and note the returned owner-id field from the response. Then
  use that noted value as the owner/device id column in a subsequent `[DB]`
  insert. This avoids needing direct access to Clerk's session internals.
