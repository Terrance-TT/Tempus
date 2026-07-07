---
name: RNW CSSStyleDeclaration crash fix
description: How the "Failed to set an indexed property [0] on 'CSSStyleDeclaration'" ErrorBoundary crash was resolved in the StudyFlow Expo/RNW app.
---

# RNW CSSStyleDeclaration crash fix

## The rule
When React Native Web throws "Failed to set an indexed property [0] on 'CSSStyleDeclaration'" during a commit, it is a transient, benign DOM error. A simple re-render recovers it cleanly. Do not remove all Animated usage or bypass all navigators expecting that to fix it — two such bypasses were tried and the error survived both.

**Why:** This error originates inside RNW's style writer when it tries to set an indexed property on a CSSStyleDeclaration object (browser security restriction). It is not caused by corrupted app state; it is a timing artifact of JS-driven Animated style flushes. Removing the navigators reduced frequency but did not eliminate it.

**How to apply:** The fix lives in `artifacts/study-flow/components/ErrorBoundary.tsx`. On web only, when `componentDidCatch` receives an error matching `/indexed property .* on ['"]?CSSStyleDeclaration['"]?/i`, it silently resets `error` state (up to 3 attempts, 50ms cooldown) instead of rendering the "Something went wrong" fallback. All other errors still show the normal fallback. Do not remove this guard without a verified replacement.

## Context
- Two architectural fixes were applied first but were insufficient:
  1. Conditional `headerShown` + custom `WebHeader` on `schedule/[id]`
  2. `WebRootLayout` in `app/_layout.tsx` that bypasses expo-router's animated `<Stack>` entirely on web
- The ErrorBoundary auto-recover is the third and final fix.
- `artifacts/study-flow/app/(tabs)/_layout.tsx` has a `WebTabLayout` that is the canonical reference for the "no animated navigator on web" pattern.
