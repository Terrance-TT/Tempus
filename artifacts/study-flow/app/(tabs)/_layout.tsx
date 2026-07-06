import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, usePathname, useRouter } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";
import HomeScreen from "./index";
import CommitmentsScreen from "./commitments";
import HistoryScreen from "./history";

/**
 * A minimal, non-animated tab layout used on web only.
 *
 * Why: react-navigation's `<Tabs>` (BottomTabView) always runs a JS-driven
 * `Animated.parallel`/`Animated.timing` pass over every route's internal
 * "scene" Animated.Value on every focus change - even when
 * `animation: "none"` is used, since the code path still creates and starts
 * the animation with `duration: 0` rather than skipping it outright. On
 * React Native Web (`useNativeDriver: false`) this intermittently throws:
 *   TypeError: Failed to set an indexed property [0] on 'CSSStyleDeclaration'
 * from deep inside `@react-navigation/bottom-tabs`'s BottomTabView, which
 * trips the root ErrorBoundary. A prior fix replaced just the tab BAR
 * (BottomTabBar) with a static WebTabBar, but the crash kept occurring
 * because BottomTabView's SCENE container animation is independent of the
 * tab bar and still ran. The only fully reliable fix is to bypass
 * react-navigation's Tabs/BottomTabView navigator entirely on web and render
 * the three tab screens directly based on the current pathname, with plain
 * (non-animated) conditional rendering. The tab screens (index/commitments/
 * history) don't use any navigation-context hooks, so this is safe.
 */
type WebTabBarProps = {
  active: "index" | "commitments" | "history";
};

const WEB_TABS: Array<{
  key: WebTabBarProps["active"];
  path: "/" | "/commitments" | "/history";
  label: string;
  icon: keyof typeof Feather.glyphMap;
}> = [
  { key: "index", path: "/", label: "Schedule", icon: "calendar" },
  { key: "commitments", path: "/commitments", label: "Commitments", icon: "list" },
  { key: "history", path: "/history", label: "History", icon: "clock" },
];

function WebTabBar({ active }: WebTabBarProps) {
  const colors = useColors();
  const router = useRouter();

  return (
    <View
      style={[
        styles.webTabBar,
        { backgroundColor: colors.background, borderTopColor: colors.border },
      ]}
    >
      {WEB_TABS.map((tab) => {
        const isFocused = active === tab.key;
        const color = isFocused ? colors.primary : colors.mutedForeground;

        return (
          <Pressable
            key={tab.key}
            onPress={() => {
              if (!isFocused) {
                router.navigate(tab.path);
              }
            }}
            style={styles.webTabItem}
            accessibilityRole="tab"
            accessibilityState={isFocused ? { selected: true } : {}}
          >
            <Feather name={tab.icon} size={22} color={color} />
            <Text style={[styles.webTabLabel, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function WebTabLayout() {
  const pathname = usePathname();

  const active: WebTabBarProps["active"] =
    pathname === "/commitments"
      ? "commitments"
      : pathname === "/history"
        ? "history"
        : "index";

  return (
    <View style={styles.webRoot}>
      <View style={styles.webScreen}>
        {active === "index" ? <HomeScreen /> : null}
        {active === "commitments" ? <CommitmentsScreen /> : null}
        {active === "history" ? <HistoryScreen /> : null}
      </View>
      <WebTabBar active={active} />
    </View>
  );
}

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "calendar", selected: "calendar" }} />
        <Label>Schedule</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="commitments">
        <Icon sf={{ default: "list.bullet.rectangle.portrait", selected: "list.bullet.rectangle.portrait.fill" }} />
        <Label>Commitments</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <Icon sf={{ default: "clock", selected: "clock.fill" }} />
        <Label>History</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: 0,
          borderTopColor: colors.border,
          elevation: 0,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Schedule",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="calendar" tintColor={color} size={24} />
            ) : (
              <Feather name="calendar" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="commitments"
        options={{
          title: "Commitments",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="list.bullet.rectangle.portrait" tintColor={color} size={24} />
            ) : (
              <Feather name="list" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="clock" tintColor={color} size={24} />
            ) : (
              <Feather name="clock" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (Platform.OS === "web") {
    return <WebTabLayout />;
  }
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  webTabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 84,
    flexDirection: "row",
    borderTopWidth: 1,
  },
  webTabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingBottom: 16,
  },
  webTabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  webRoot: {
    flex: 1,
  },
  webScreen: {
    flex: 1,
    paddingBottom: 84,
  },
});
