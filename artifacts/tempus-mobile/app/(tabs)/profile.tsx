import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

function SettingRow({
  icon,
  label,
  value,
  onPress,
  colors,
  destructive,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  colors: ReturnType<typeof useColors>;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingRow,
        { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 },
      ]}
      disabled={!onPress}
    >
      <Feather name={icon as any} size={18} color={destructive ? colors.destructive : colors.primary} />
      <Text
        style={[
          styles.settingLabel,
          { color: destructive ? colors.destructive : colors.foreground, fontFamily: "Inter_500Medium" },
        ]}
      >
        {label}
      </Text>
      <View style={{ flex: 1 }} />
      {value ? (
        <Text style={[styles.settingValue, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {value}
        </Text>
      ) : null}
      {onPress && <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
    </Pressable>
  );
}

function IntegrationRow({
  icon,
  name,
  status,
  color,
  colors,
}: {
  icon: string;
  name: string;
  status: "connected" | "disconnected";
  color: string;
  colors: ReturnType<typeof useColors>;
}) {
  const connected = status === "connected";
  return (
    <Pressable
      style={[styles.integrationRow, { borderBottomColor: colors.border }]}
    >
      <View style={[styles.integrationIcon, { backgroundColor: color + "20" }]}>
        <Feather name={icon as any} size={16} color={color} />
      </View>
      <Text style={[styles.integrationName, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
        {name}
      </Text>
      <View style={{ flex: 1 }} />
      <View
        style={[
          styles.integrationStatus,
          {
            backgroundColor: connected ? colors.primary + "20" : colors.muted,
          },
        ]}
      >
        <Text
          style={[
            styles.integrationStatusText,
            {
              color: connected ? colors.primary : colors.mutedForeground,
              fontFamily: "Inter_600SemiBold",
            },
          ]}
        >
          {connected ? "Connected" : "Connect"}
        </Text>
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { preferences, updatePreferences } = useApp();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(preferences.name);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const handleSaveName = () => {
    if (nameInput.trim()) updatePreferences({ name: nameInput.trim() });
    setEditingName(false);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: botPad + 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Profile
        </Text>
      </View>

      <View style={[styles.avatarSection, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarInitial, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>
            {(preferences.name || "S").charAt(0).toUpperCase()}
          </Text>
        </View>
        {editingName ? (
          <View style={styles.nameEditRow}>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              style={[
                styles.nameInput,
                { color: colors.foreground, borderColor: colors.primary, fontFamily: "Inter_600SemiBold" },
              ]}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />
            <Pressable onPress={handleSaveName}>
              <Feather name="check" size={20} color={colors.primary} />
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setEditingName(true)} style={styles.nameRow}>
            <Text style={[styles.nameText, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {preferences.name}
            </Text>
            <Feather name="edit-2" size={14} color={colors.mutedForeground} />
          </Pressable>
        )}
        <Text style={[styles.roleText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Columbia University
        </Text>
      </View>

      <View style={[styles.proCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
        <View style={styles.proContent}>
          <View style={[styles.proBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.proBadgeText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>
              PRO
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.proTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Upgrade to Tempus Pro
            </Text>
            <Text style={[styles.proDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Unlimited AI generations, advanced analytics, and more
            </Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.proBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.proBtnText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>
            Upgrade
          </Text>
        </Pressable>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
          INTEGRATIONS
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <IntegrationRow icon="book" name="Canvas LMS" status="disconnected" color="#E66000" colors={colors} />
          <IntegrationRow icon="layers" name="Schoology" status="disconnected" color="#1B3FA0" colors={colors} />
          <IntegrationRow icon="grid" name="Google Classroom" status="disconnected" color="#1A73E8" colors={colors} />
          <IntegrationRow icon="calendar" name="Google Calendar" status="disconnected" color="#34A853" colors={colors} />
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
          PREFERENCES
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="sunrise"
            label="Wake time"
            value={preferences.wakeTime}
            colors={colors}
          />
          <SettingRow
            icon="moon"
            label="Sleep time"
            value={preferences.sleepTime}
            colors={colors}
          />
          <SettingRow
            icon="target"
            label="Daily study goal"
            value={`${preferences.dailyGoalHours}h`}
            onPress={() => {
              const goals = [2, 3, 4, 5, 6, 8];
              const current = preferences.dailyGoalHours;
              const next = goals[(goals.indexOf(current) + 1) % goals.length];
              updatePreferences({ dailyGoalHours: next });
            }}
            colors={colors}
          />
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
          ACCOUNT
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="message-square"
            label="Send feedback"
            onPress={() => Alert.alert("Feedback", "Open the web app to submit feedback.")}
            colors={colors}
          />
          <SettingRow
            icon="shield"
            label="Privacy policy"
            colors={colors}
            onPress={() => {}}
          />
          <SettingRow
            icon="log-out"
            label="Sign out"
            destructive
            colors={colors}
            onPress={() => Alert.alert("Sign out", "Sign out functionality requires account setup.")}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 28 },
  avatarSection: {
    alignItems: "center",
    padding: 24,
    gap: 8,
    borderBottomWidth: 1,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: 32 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  nameText: { fontSize: 20 },
  nameEditRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  nameInput: {
    borderBottomWidth: 1.5,
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 20,
    minWidth: 120,
  },
  roleText: { fontSize: 13 },
  proCard: {
    margin: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  proContent: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  proBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  proBadgeText: { fontSize: 11, letterSpacing: 0.5 },
  proTitle: { fontSize: 15, marginBottom: 2 },
  proDesc: { fontSize: 13, lineHeight: 18 },
  proBtn: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  proBtnText: { fontSize: 15 },
  sectionBlock: { paddingHorizontal: 20, marginTop: 20 },
  sectionLabel: { fontSize: 11, letterSpacing: 0.8, marginBottom: 8 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
  },
  settingLabel: { fontSize: 15 },
  settingValue: { fontSize: 14 },
  integrationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
  },
  integrationIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  integrationName: { fontSize: 15 },
  integrationStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  integrationStatusText: { fontSize: 12 },
});
