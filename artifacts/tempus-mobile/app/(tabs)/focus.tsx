import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DotPattern } from "@/components/DotPattern";
import { Fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

type BlockMode = "work_blocks" | "non_free" | "always";

const DEFAULT_SITES = ["instagram.com", "x.com", "reddit.com", "youtube.com"];

function Divider({ colors }: { colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

function ProgressBar({
  value,
  max,
  colors,
}: {
  value: number;
  max: number;
  colors: ReturnType<typeof useColors>;
}) {
  const pct = max > 0 ? Math.max(4, (value / max) * 100) : 4;
  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
      <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: colors.primary }]} />
    </View>
  );
}

export default function FocusGuardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [blocking, setBlocking] = useState(true);
  const [hideSwitch, setHideSwitch] = useState(false);
  const [showClock, setShowClock] = useState(true);
  const [blockMode, setBlockMode] = useState<BlockMode>("work_blocks");
  const [blockedSites, setBlockedSites] = useState<string[]>(DEFAULT_SITES);
  const [newSite, setNewSite] = useState("");
  const [connectionCode] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 84 : insets.bottom + 60;

  const handleAddSite = () => {
    const domain = newSite.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[/?#].*$/, "");
    if (!domain || !domain.includes(".")) {
      Alert.alert("Enter a valid site", "For example: youtube.com");
      return;
    }
    if (blockedSites.includes(domain)) {
      Alert.alert("Already blocked", `${domain} is already in your list.`);
      setNewSite("");
      return;
    }
    setBlockedSites((prev) => [...prev, domain]);
    setNewSite("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRemoveSite = (site: string) => {
    setBlockedSites((prev) => prev.filter((s) => s !== site));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleGetCode = () => {
    Alert.alert(
      "Connection code",
      "To get a connection code, open the Tempus web app and navigate to Focus Guard.",
      [{ text: "OK" }]
    );
  };

  const MODES: { id: BlockMode; label: string; desc: string }[] = [
    {
      id: "work_blocks",
      label: "Only during work blocks",
      desc: "Blocked while a homework or study block is on your schedule.",
    },
    {
      id: "non_free",
      label: "Whenever it's not free time",
      desc: "Blocked during class, work blocks — anything that isn't a break.",
    },
    {
      id: "always",
      label: "All day",
      desc: "Blocked around the clock, no schedule needed — great for testing the extension.",
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <DotPattern />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: topPad + 48,
          paddingHorizontal: 20,
          paddingBottom: botPad,
          gap: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: Fonts.heading }]}>
            Focus Guard
          </Text>
          <Text style={[styles.pageSubtitle, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
            Your distraction blocker, controlled entirely from here.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Feather name="shield" size={18} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: Fonts.headingSemibold }]}>
                Tempus Focus 4
              </Text>
            </View>
            <View style={[styles.badge, { borderColor: colors.border }]}>
              <Text style={[styles.badgeText, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
                Chrome extension
              </Text>
            </View>
          </View>
          <Text style={[styles.cardDesc, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
            Blocks distracting sites while you're supposed to be working. The extension itself is just a clock — everything is controlled from here.
          </Text>

          <View style={styles.setupSteps}>
            {[
              "Download the extension and unzip it.",
              "In Chrome, open chrome://extensions, turn on Developer mode, click Load unpacked and pick the unzipped folder.",
              "Generate your connection code and paste it into the extension popup.",
            ].map((step, i) => (
              <View key={i} style={styles.setupStep}>
                <Text style={[styles.setupNum, { color: colors.mutedForeground, fontFamily: Fonts.sansMedium }]}>
                  {i + 1}.
                </Text>
                <Text style={[styles.setupText, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
                  {step}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.setupBtns}>
            <Pressable
              onPress={() => Alert.alert("Download", "Download the extension from the Tempus web app.")}
              style={({ pressed }) => [
                styles.outlineBtn,
                { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="download" size={15} color={colors.foreground} />
              <Text style={[styles.outlineBtnText, { color: colors.foreground, fontFamily: Fonts.sansMedium }]}>
                Download extension
              </Text>
            </Pressable>
            <Pressable
              onPress={handleGetCode}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground, fontFamily: Fonts.sansBold }]}>
                Get connection code
              </Text>
            </Pressable>
          </View>

          <Divider colors={colors} />

          {!hideSwitch && (
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: colors.foreground, fontFamily: Fonts.sansMedium }]}>
                  Blocking enabled
                </Text>
                <Text style={[styles.settingDesc, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
                  Turn Focus Guard on or off.
                </Text>
              </View>
              <Switch
                value={blocking}
                onValueChange={setBlocking}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          )}

          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.settingLabelRow}>
                <Feather name={hideSwitch ? "eye-off" : "eye"} size={14} color={colors.foreground} />
                <Text style={[styles.settingLabel, { color: colors.foreground, fontFamily: Fonts.sansMedium }]}>
                  Hide the on/off switch
                </Text>
              </View>
              <Text style={[styles.settingDesc, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
                Commit mode — hide the switch so you can't turn blocking off on a whim.
              </Text>
            </View>
            <Switch
              value={hideSwitch}
              onValueChange={(v) => {
                setHideSwitch(v);
                if (v) setBlocking(true);
              }}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <Divider colors={colors} />

          <View style={{ gap: 12 }}>
            <Text style={[styles.settingLabel, { color: colors.foreground, fontFamily: Fonts.sansMedium }]}>
              When should sites be blocked?
            </Text>
            {MODES.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => {
                  setBlockMode(m.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={styles.radioRow}
              >
                <View
                  style={[
                    styles.radioOuter,
                    { borderColor: blockMode === m.id ? colors.primary : colors.border },
                  ]}
                >
                  {blockMode === m.id && (
                    <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.radioLabel, { color: colors.foreground, fontFamily: Fonts.sansMedium }]}>
                    {m.label}
                  </Text>
                  <Text style={[styles.radioDesc, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
                    {m.desc}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          <Divider colors={colors} />

          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.settingLabelRow}>
                <Feather name="clock" size={14} color={colors.foreground} />
                <Text style={[styles.settingLabel, { color: colors.foreground, fontFamily: Fonts.sansMedium }]}>
                  Show the clock
                </Text>
              </View>
              <Text style={[styles.settingDesc, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
                A minimal countdown in the extension showing time left on your current assignment.
              </Text>
            </View>
            <Switch
              value={showClock}
              onValueChange={setShowClock}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <Divider colors={colors} />

          <View style={{ gap: 10 }}>
            <Text style={[styles.settingLabel, { color: colors.foreground, fontFamily: Fonts.sansMedium }]}>
              Blocked sites
            </Text>
            <View style={styles.addSiteRow}>
              <TextInput
                value={newSite}
                onChangeText={setNewSite}
                placeholder="e.g. youtube.com"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.siteInput,
                  { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background, fontFamily: Fonts.sans },
                ]}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleAddSite}
              />
              <Pressable
                onPress={handleAddSite}
                style={({ pressed }) => [
                  styles.addSiteBtn,
                  { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Feather name="plus" size={18} color={colors.foreground} />
              </Pressable>
            </View>
            {blockedSites.length === 0 && (
              <Text style={[styles.emptyHint, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
                No sites on the list — add some above.
              </Text>
            )}
            <View style={styles.chips}>
              {blockedSites.map((site) => (
                <View key={site} style={[styles.chip, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.chipText, { color: colors.secondaryForeground, fontFamily: Fonts.sansMedium }]}>
                    {site}
                  </Text>
                  <Pressable onPress={() => handleRemoveSite(site)} hitSlop={6}>
                    <Feather name="x" size={12} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>

          <Divider colors={colors} />

          <View style={{ gap: 10 }}>
            <View style={styles.settingLabelRow}>
              <Feather name="bar-chart-2" size={14} color={colors.foreground} />
              <Text style={[styles.settingLabel, { color: colors.foreground, fontFamily: Fonts.sansMedium }]}>
                Where your time goes
              </Text>
              <View style={[styles.proBadge, { backgroundColor: "#fef3c7", borderColor: "#fcd34d" }]}>
                <Text style={[styles.proBadgeText, { color: "#92400e", fontFamily: Fonts.sansBold }]}>
                  Pro
                </Text>
              </View>
            </View>
            <View style={[styles.proGate, { backgroundColor: colors.muted + "66", borderRadius: 12 }]}>
              <Text style={[styles.proGateText, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
                See which sites eat the most of your time, tracked by the extension over the last week.
              </Text>
              <Pressable
                onPress={() => Alert.alert("Upgrade", "Upgrade to Tempus Pro in Settings.")}
                style={({ pressed }) => [
                  styles.upgradeBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Feather name="star" size={13} color={colors.primaryForeground} />
                <Text style={[styles.upgradeBtnText, { color: colors.primaryForeground, fontFamily: Fonts.sansBold }]}>
                  Upgrade
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { gap: 4 },
  pageTitle: { fontSize: 32, lineHeight: 38 },
  pageSubtitle: { fontSize: 16, lineHeight: 22 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 18 },
  badge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12 },
  cardDesc: { fontSize: 13, lineHeight: 19 },
  setupSteps: { gap: 6 },
  setupStep: { flexDirection: "row", gap: 6 },
  setupNum: { fontSize: 13, width: 16 },
  setupText: { fontSize: 13, flex: 1, lineHeight: 18 },
  setupBtns: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  outlineBtnText: { fontSize: 14 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryBtnText: { fontSize: 14 },
  divider: { height: 1 },
  settingRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  settingLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  settingLabel: { fontSize: 14 },
  settingDesc: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  radioRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  radioInner: { width: 9, height: 9, borderRadius: 5 },
  radioLabel: { fontSize: 14 },
  radioDesc: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  addSiteRow: { flexDirection: "row", gap: 8 },
  siteInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  addSiteBtn: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyHint: { fontSize: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  chipText: { fontSize: 13 },
  proBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  proBadgeText: { fontSize: 10 },
  proGate: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  proGateText: { flex: 1, fontSize: 12, lineHeight: 17 },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  upgradeBtnText: { fontSize: 12 },
  progressTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4 },
});
