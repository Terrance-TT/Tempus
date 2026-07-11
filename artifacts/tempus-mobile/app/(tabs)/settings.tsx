import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DotPattern } from "@/components/DotPattern";
import { Fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

const COLOR_PRESETS = [
  { id: "forest", label: "Forest", swatch: "#4e9174" },
  { id: "ocean", label: "Ocean", swatch: "#3b82f6" },
  { id: "rose", label: "Rose", swatch: "#f43f5e" },
  { id: "amber", label: "Amber", swatch: "#f59e0b" },
  { id: "violet", label: "Violet", swatch: "#8b5cf6" },
];

function SettingsGearIcon({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.gearIcon, { backgroundColor: colors.primary + "33" }]}>
      <Feather name="settings" size={24} color={colors.primary} />
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<"light" | "dark">(systemScheme ?? "light");
  const [presetId, setPresetId] = useState("forest");
  const [isPro] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 84 : insets.bottom + 60;

  const handleUpgrade = () => {
    Alert.alert("Go Pro", "Stripe checkout requires authentication. Sign in via the web app to upgrade.");
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <DotPattern />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: topPad + 48,
          paddingHorizontal: 20,
          paddingBottom: botPad,
          gap: 28,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <SettingsGearIcon colors={colors} />
          <View>
            <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: Fonts.heading }]}>
              Settings
            </Text>
            <Text style={[styles.pageSubtitle, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
              Make Tempus look and feel like yours.
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardSection}>
            <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: Fonts.headingSemibold }]}>
              Appearance
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
              Choose how Tempus looks on this device.
            </Text>
          </View>
          <View style={styles.themeRow}>
            {(["light", "dark"] as const).map((mode) => {
              const active = themeMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setThemeMode(mode)}
                  style={({ pressed }) => [
                    styles.themeOption,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primary + "0d" : "transparent",
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={[styles.themeIconBox, { backgroundColor: colors.secondary }]}>
                    <Feather
                      name={mode === "light" ? "sun" : "moon"}
                      size={16}
                      color={colors.foreground}
                    />
                  </View>
                  <Text style={[styles.themeLabel, { color: colors.foreground, fontFamily: Fonts.sansMedium }]}>
                    {mode === "light" ? "Light" : "Dark"}
                  </Text>
                  {active && (
                    <Feather name="check" size={16} color={colors.primary} style={{ marginLeft: "auto" }} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardSectionRow}>
            <View>
              <View style={styles.subTitleRow}>
                <Feather name="zap" size={15} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: Fonts.headingSemibold }]}>
                  Subscription
                </Text>
              </View>
              <Text style={[styles.cardSubtitle, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
                Test the Stripe checkout flow.
              </Text>
            </View>
            <View style={[styles.subBadge, { backgroundColor: isPro ? colors.primary + "20" : colors.secondary }]}>
              <Text style={[styles.subBadgeText, { color: isPro ? colors.primary : colors.mutedForeground, fontFamily: Fonts.sansBold }]}>
                {isPro ? "Pro" : "Free"}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={handleUpgrade}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="zap" size={15} color={colors.primaryForeground} />
            <Text style={[styles.primaryBtnText, { color: colors.primaryForeground, fontFamily: Fonts.sansBold }]}>
              Go Pro
            </Text>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardSection}>
            <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: Fonts.headingSemibold }]}>
              Accent color
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
              Pick the color that shows up across buttons and highlights.
            </Text>
          </View>
          <View style={styles.presets}>
            {COLOR_PRESETS.map((preset) => {
              const active = presetId === preset.id;
              return (
                <Pressable
                  key={preset.id}
                  onPress={() => setPresetId(preset.id)}
                  style={styles.presetItem}
                >
                  <View
                    style={[
                      styles.presetSwatch,
                      { backgroundColor: preset.swatch },
                      active && styles.presetSwatchActive,
                    ]}
                  >
                    {active && <Feather name="check" size={14} color="#fff" />}
                  </View>
                  <Text style={[styles.presetLabel, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
                    {preset.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardSection}>
            <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: Fonts.headingSemibold }]}>
              Browser extension
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
              Manage the Tempus extension's own settings.
            </Text>
          </View>
          <View style={[styles.disabledRow, { borderColor: colors.border }]}>
            <View style={[styles.rowIconBox, { backgroundColor: colors.secondary }]}>
              <Feather name="chrome" size={16} color={colors.foreground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.foreground + "99", fontFamily: Fonts.sansMedium }]}>
                Chrome extension settings
              </Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
                Coming soon
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardSection}>
            <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: Fonts.headingSemibold }]}>
              Legal
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
              Review how Tempus handles your data.
            </Text>
          </View>
          <Pressable
            onPress={() => Alert.alert("Privacy Policy", "View the full privacy policy at tempus.app/privacy.")}
            style={({ pressed }) => [
              styles.linkRow,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={[styles.rowIconBox, { backgroundColor: colors.secondary }]}>
              <Feather name="file-text" size={16} color={colors.foreground} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: Fonts.sansMedium }]}>
              Privacy Policy
            </Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={{ marginLeft: "auto" }} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 16 },
  gearIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: { fontSize: 30, lineHeight: 36 },
  pageSubtitle: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  cardSection: { gap: 2 },
  cardSectionRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  cardTitle: { fontSize: 17 },
  cardSubtitle: { fontSize: 13, lineHeight: 18 },
  subTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  subBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  subBadgeText: { fontSize: 13 },
  themeRow: { gap: 10 },
  themeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  themeIconBox: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  themeLabel: { fontSize: 14 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: { fontSize: 15 },
  presets: { flexDirection: "row", justifyContent: "space-between" },
  presetItem: { alignItems: "center", gap: 6 },
  presetSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  presetSwatchActive: {
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.3)",
  },
  presetLabel: { fontSize: 11 },
  disabledRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    opacity: 0.6,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  rowIconBox: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 14 },
  rowSub: { fontSize: 12, marginTop: 1 },
});
