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
Two known-incompatible-with-web libraries in the default Expo Router +
tabs scaffold can trigger this:
1. `react-native-keyboard-controller`'s `KeyboardProvider` — manipulates
   native view styles for keyboard-avoiding animations; not reliable on RNW.
2. `react-native-screens`' native-stack screen transition animations
   (the default `Stack` screenOptions animation) — also not reliable on RNW.

`useNativeDriver: true` on `Animated.spring`/`Animated.timing` calls is
**not** the cause (a plausible-looking but wrong first hypothesis) — fixing
that alone did not resolve the crash.

## Fix
**Why:** both libraries listed above are native-focused and their web
codepaths can hit this DOM API mismatch under real navigation, not just
synthetic animation.
**How to apply:** in the Expo Router root layout, disable both on web via
`Platform.OS === "web"` conditionals:
- Skip wrapping children in `<KeyboardProvider>` on web (render children
  directly instead).
- Pass `animation: "none"` in the root `<Stack screenOptions={{...}}>` on
  web only, leaving native platforms untouched.

## How to isolate this class of bug
Bisect by removing suspects one at a time and re-testing the exact
navigation sequence that crashes (not just page loads):
- `useNativeDriver` on Animated calls (usually NOT it, but easy first guess)
- `KeyboardProvider` (react-native-keyboard-controller)
- Stack/tab transition animations (react-native-screens)
A minimal repro that doesn't require app-specific flows: type into any
TextInput, then navigate via the bottom tab bar (not URL) a couple of times.
