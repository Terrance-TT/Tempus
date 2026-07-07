import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import TabLayout from "./(tabs)/_layout";
import OnboardingScreen from "./onboarding";
import GenerateScreen from "./generate";
import ScheduleScreen from "./schedule/[id]";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

/**
 * A minimal, non-animated root layout used on web only.
 *
 * Why: even with `headerShown: false` and `animation: "none"`, expo-router's
 * `<Stack>` (native-stack under the hood) still mounts an
 * `AnimatedHeaderHeightProvider`/header-height `Animated.Value` for every
 * screen and drives JS (non-native-driver) style writes during screen
 * mount/unmount transitions - the same class of bug documented in
 * app/(tabs)/_layout.tsx for the bottom-tabs scene animation. On React
 * Native Web this intermittently throws:
 *   TypeError: Failed to set an indexed property [0] on 'CSSStyleDeclaration'
 * which trips the root ErrorBoundary, reproducibly when navigating back
 * from the schedule detail screen to the tabs. The only fully reliable fix
 * (as with the tabs) is to bypass react-navigation's Stack navigator
 * entirely on web and render the matched top-level screen directly based on
 * the current pathname, with plain (non-animated) conditional rendering.
 * `useRouter`/`usePathname` still work here because expo-router's
 * `NavigationContainer` is set up above this layout regardless of which
 * navigator (or none) this component renders.
 */
function WebRootLayout() {
  const pathname = usePathname();

  if (pathname === "/onboarding") {
    return <OnboardingScreen />;
  }
  if (pathname === "/generate") {
    return <GenerateScreen />;
  }
  if (pathname.startsWith("/schedule/")) {
    return <ScheduleScreen />;
  }
  return <TabLayout />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  const stackContent = (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ presentation: "fullScreenModal" }} />
      <Stack.Screen name="generate" options={{ presentation: "modal" }} />
      <Stack.Screen
        name="schedule/[id]"
        options={{ presentation: "card", headerShown: true, title: "Schedule" }}
      />
    </Stack>
  );

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            {Platform.OS === "web" ? (
              <WebRootLayout />
            ) : (
              <KeyboardProvider>{stackContent}</KeyboardProvider>
            )}
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
