---
name: User-supplied base URLs need SSRF guards
description: Any feature that stores a user-provided server URL (e.g. Canvas LMS) and fetches it server-side must validate the host.
---

**Rule:** When users supply a base URL that the api-server later fetches with a stored credential (Canvas-style integrations), enforce: HTTPS only (default port), no userinfo, and resolve the hostname — reject localhost/private/link-local/multicast IPs (v4 and v6, incl. ::ffff: mapped). Re-check at import time, not just at connect time.

**Why:** Architect review flagged the initial Canvas integration as a high-severity SSRF + token-exfiltration risk: arbitrary http:// hosts let a user point the server at internal services and leak Bearer tokens over plaintext.

**How to apply:** Reuse the `normalizeCanvasBaseUrl` / `isPublicCanvasHost` pattern in the integrations routes for any new "connect your school/server" feature (Moodle, Schoology, etc.).

**Related:** Import counts must be deterministic — prefetch existing (source, externalId) keys and count misses; don't infer "new" from createdAt recency. OAuth reconnect flows must not auto-redirect on error after a callback-triggered retry (redirect-loop risk).
