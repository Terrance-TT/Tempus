---
name: Expo web crash - CSSStyleDeclaration indexed property
description: React Native Web fatal crash from react-native-keyboard-controller and/or react-native-screens stack transition animations; how to fix and how to isolate.
---

## Symptom
Expo Router app running on web (react-native-web) intermittently throws an
uncaught error that trips the root ErrorBoundary ("Something went wrong"):

```
TypeError: Failed to set an indexed property [0] on 'CSSStyleDeclaration':
Indexed property setter is not supported.
```

Stack trace points into React's commit phase (`setValueForStyle` →
`setValueForStyles` → `setProp` → `setInitialProperties` → `completeWork`),
i.e. RNW is trying to write a numeric-indexed entry into a real DOM
`style` object, which the DOM doesn't support the way native `style` arrays
do.

It tends to reproduce specifically around **tab bar navigation** and/or
**stack screen push/pop** (e.g. delete an item then switch tabs, or go back
from a stack screen then switch tabs) — i.e. whenever a native-only
animation/transition library tries to run during a web navigation event.

## Root cause
Several known-incompatible-with-web libraries/patterns in the default Expo
Router + tabs scaffold can trigger this — it's a *class* of bug (any
JS-driven, `useNativeDriver: false` `Animated.Value` write to a DOM `style`
during a web navigation/mount event), not a single library:
1. `react-native-keyboard-controller`'s `KeyboardProvider` — manipulates
   native view styles for keyboard-avoiding animations; not reliable on RNW.
2. `react-native-screens`' native-stack screen transition animations
   (the default `Stack` screenOptions animation) — also not reliable on RNW.
3. `@react-navigation/bottom-tabs`'s `BottomTabView` internal
   `Animated.parallel`/`Animated.timing` **scene container** transition —
   this runs unconditionally on every tab focus change, even when
   `animation: "none"` is passed, because that option only skips the
   duration, not the animated code path itself. This is independent of the
   tab **bar** — replacing just the `tabBar` component does NOT fix it.
   Confirmed via the app's ErrorBoundary "View error details" stack trace.
4. Any app-level `Animated.Value`-driven mount fade/slide-in (e.g. list
   item entrance animations) using `useNativeDriver: Platform.OS !== "web"`
   — same underlying DOM API mismatch, just a different trigger site.

`useNativeDriver: true` on `Animated.spring`/`Animated.timing` calls is
**not** the cause on its own (a plausible-looking but wrong first
hypothesis) — fixing that alone did not resolve the crash.

## Fix
**Why:** all of the above are native-focused animation code paths whose web
fallback can hit this DOM API mismatch under real navigation/mount, not
just synthetic animation.
**How to apply:**
- Skip wrapping children in `<KeyboardProvider>` on web (render children
  directly instead).
- Pass `animation: "none"` in the root `<Stack screenOptions={{...}}>` on
  web only, leaving native platforms untouched.
- For `@react-navigation/bottom-tabs` (`<Tabs>`/`BottomTabView`): there is
  no supported option to disable the internal scene-transition Animated
  code path. The only fully reliable fix is to **bypass the Tabs navigator
  entirely on web** — render a plain `Platform.OS === "web"` branch that
  imports the tab screens directly and shows/hides them via
  `usePathname()`/`useRouter()` with a static (non-Animated) custom tab
  bar. Keep the native `<Tabs>`/`NativeTabs` path untouched for iOS/Android.
- For any app-level mount-fade animations: branch on `Platform.OS === "web"`
  and render the final (fully visible) static state directly, skipping the
  `Animated.Value`/`Animated.spring`/`Animated.timing` call entirely on web.
  Purely cosmetic entrance animations are not worth the crash risk.

## How to isolate this class of bug
Bisect by removing suspects one at a time and re-testing the exact
navigation sequence that crashes (not just page loads):
- `useNativeDriver` on Animated calls (usually NOT it, but easy first guess)
- `KeyboardProvider` (react-native-keyboard-controller)
- Stack transition animations (react-native-screens)
- Tab transition animations (`@react-navigation/bottom-tabs` BottomTabView
  scene container — check by bypassing `<Tabs>` entirely on web, not just
  swapping the tab bar component)
- Any custom `Animated.Value` mount animations in list rows/screens
A minimal repro that doesn't require app-specific flows: type into any
TextInput, then navigate via the bottom tab bar (not URL) a couple of times,
rapidly, several times in a row.
