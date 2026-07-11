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

import { DotPattern } from "@/components/DotPattern";
import { Assignment, useApp } from "@/contexts/AppContext";
import { Fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

type PanelId = "canvas" | "sps" | "classroom" | "schoology" | "focusguard" | null;

const TOOLS = [
  {
    id: "canvas" as const,
    name: "Canvas LMS",
    iconName: "book-open",
    iconBg: "primaryLight",
    description: "Import upcoming assignments from your Canvas courses",
    badgeText: null,
  },
  {
    id: "sps" as const,
    name: "SPS Engage",
    iconName: "calendar",
    iconBg: "blueLight",
    description: "Add events from your SPS Engage calendar as fixed schedule blocks",
    badgeText: "Columbia students",
  },
  {
    id: "classroom" as const,
    name: "Google Classroom",
    iconName: "grid",
    iconBg: "primaryLight",
    description: "Import upcoming coursework from your Google Classroom classes",
    badgeText: null,
  },
  {
    id: "schoology" as const,
    name: "Schoology",
    iconName: "layers",
    iconBg: "emeraldLight",
    description: "Import upcoming assignments from your Schoology courses",
    badgeText: null,
  },
  {
    id: "focusguard" as const,
    name: "Focus Guard",
    iconName: "shield",
    iconBg: "primaryLight",
    description: "Blocks distracting sites while you're supposed to be working",
    badgeText: null,
  },
] as const;

function iconBgColor(key: string, primary: string): string {
  switch (key) {
    case "blueLight": return "#3b82f620";
    case "emeraldLight": return "#10b98120";
    default: return primary + "1a";
  }
}

function iconColor(key: string, primary: string): string {
  switch (key) {
    case "blueLight": return "#3b82f6";
    case "emeraldLight": return "#10b981";
    default: return primary;
  }
}

function AssignmentRow({
  a,
  onDelete,
  colors,
}: {
  a: Assignment;
  onDelete: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [expanded, setExpanded] = useState(false);
  const due = new Date(a.dueDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const sourceLabel = a.source === "canvas" ? "Canvas" : a.source === "schoology" ? "Schoology" : "Classroom";

  return (
    <View style={[styles.assignmentRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.assignmentMain}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.assignmentTitle, { color: colors.foreground, fontFamily: Fonts.sansMedium }]} numberOfLines={1}>
            {a.title}
          </Text>
          <View style={styles.assignmentMeta}>
            {a.course && (
              <Text style={[styles.assignmentCourse, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
                {a.course}
              </Text>
            )}
            <Text style={[styles.assignmentDue, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
              Due {due}
            </Text>
            <View style={[styles.sourceBadge, { borderColor: colors.border }]}>
              <Text style={[styles.sourceBadgeText, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
                {sourceLabel}
              </Text>
            </View>
          </View>
        </View>
        <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8}>
          <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Feather name="trash-2" size={16} color={colors.destructive} />
        </Pressable>
      </View>
      {expanded && (
        <View style={[styles.expandedRow, { borderTopColor: colors.border, backgroundColor: colors.muted + "4d" }]}>
          <Text style={[styles.expandedText, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
            No description available for this assignment.
          </Text>
        </View>
      )}
    </View>
  );
}

function PanelContent({
  id,
  colors,
}: {
  id: Exclude<PanelId, null>;
  colors: ReturnType<typeof useColors>;
}) {
  const [canvasUrl, setCanvasUrl] = useState("https://courseworks2.columbia.edu/");
  const [canvasToken, setCanvasToken] = useState("");

  if (id === "canvas") {
    return (
      <View style={{ gap: 12 }}>
        <Text style={[styles.panelText, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
          Enter your Canvas URL and personal access token to import assignments.
        </Text>
        <View style={styles.formField}>
          <Text style={[styles.label, { color: colors.foreground, fontFamily: Fonts.sansMedium }]}>Canvas URL</Text>
          <TextInput
            value={canvasUrl}
            onChangeText={setCanvasUrl}
            style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background, fontFamily: Fonts.sans }]}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>
        <View style={styles.formField}>
          <Text style={[styles.label, { color: colors.foreground, fontFamily: Fonts.sansMedium }]}>Access token</Text>
          <TextInput
            value={canvasToken}
            onChangeText={setCanvasToken}
            style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.background, fontFamily: Fonts.sans }]}
            placeholder="Paste your Canvas token"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
          />
        </View>
        <Pressable
          onPress={() => Alert.alert("Canvas", "Connect via the web app to use this integration.")}
          style={({ pressed }) => [styles.connectBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={[styles.connectBtnText, { color: colors.primaryForeground, fontFamily: Fonts.sansBold }]}>
            Connect Canvas
          </Text>
        </Pressable>
      </View>
    );
  }

  if (id === "sps") {
    return (
      <View style={{ gap: 12 }}>
        <Text style={[styles.panelText, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
          Paste your SPS Engage ICS URL to import events as fixed schedule blocks.
        </Text>
        <Pressable
          onPress={() => Alert.alert("SPS Engage", "Connect via the web app to use this integration.")}
          style={({ pressed }) => [styles.connectBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={[styles.connectBtnText, { color: colors.primaryForeground, fontFamily: Fonts.sansBold }]}>
            Import events
          </Text>
        </Pressable>
      </View>
    );
  }

  if (id === "classroom") {
    return (
      <View style={{ gap: 12 }}>
        <Text style={[styles.panelText, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
          Connect your Google account to import upcoming coursework from Google Classroom.
        </Text>
        <Pressable
          onPress={() => Alert.alert("Google Classroom", "Connect via the web app to use this integration.")}
          style={({ pressed }) => [styles.connectBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
        >
          <Feather name="external-link" size={15} color={colors.primaryForeground} />
          <Text style={[styles.connectBtnText, { color: colors.primaryForeground, fontFamily: Fonts.sansBold }]}>
            Connect Google account
          </Text>
        </Pressable>
      </View>
    );
  }

  if (id === "schoology") {
    return (
      <View style={{ gap: 12 }}>
        <Text style={[styles.panelText, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
          Enter your Schoology API credentials to import assignments.
        </Text>
        <Pressable
          onPress={() => Alert.alert("Schoology", "Connect via the web app to use this integration.")}
          style={({ pressed }) => [styles.connectBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={[styles.connectBtnText, { color: colors.primaryForeground, fontFamily: Fonts.sansBold }]}>
            Connect Schoology
          </Text>
        </Pressable>
      </View>
    );
  }

  if (id === "focusguard") {
    return (
      <View style={{ gap: 12 }}>
        <Text style={[styles.panelText, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
          Blocks distracting sites while you're supposed to be working. Configure it in the Focus Guard tab.
        </Text>
        <View style={[styles.redirectNote, { backgroundColor: colors.muted, borderRadius: 12 }]}>
          <Feather name="shield" size={14} color={colors.primary} />
          <Text style={[styles.redirectText, { color: colors.foreground, fontFamily: Fonts.sans }]}>
            Go to the Focus Guard tab to manage your settings
          </Text>
        </View>
      </View>
    );
  }

  return null;
}

export default function IntegrationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { assignments, toggleAssignment } = useApp();
  const [openPanel, setOpenPanel] = useState<PanelId>(null);
  const [localAssignments, setLocalAssignments] = useState(assignments);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 84 : insets.bottom + 60;

  const togglePanel = (id: Exclude<PanelId, null>) => {
    setOpenPanel((prev) => (prev === id ? null : id));
  };

  const handleDelete = (id: string) => {
    setLocalAssignments((prev) => prev.filter((a) => a.id !== id));
  };

  const activeTool = TOOLS.find((t) => t.id === openPanel);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <DotPattern />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: topPad + 48,
          paddingHorizontal: 20,
          paddingBottom: botPad,
          gap: 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <View style={[styles.headerIcon, { backgroundColor: colors.primary + "1a" }]}>
              <Feather name="zap" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: Fonts.heading }]}>
              Integrations
            </Text>
          </View>
          <Text style={[styles.pageSubtitle, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
            Connect your school tools to pull assignments straight into your study plans.
          </Text>
        </View>

        {localAssignments.length > 0 && (
          <View style={{ gap: 12 }}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: Fonts.headingSemibold }]}>
                Imported Assignments
              </Text>
              <View style={[styles.countBadge, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.countBadgeText, { color: colors.secondaryForeground, fontFamily: Fonts.sansMedium }]}>
                  {localAssignments.length}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => Alert.alert("Generate schedule", "Open the web app to generate a schedule from your imports.")}
              style={({ pressed }) => [
                styles.generateCard,
                { backgroundColor: colors.primary + "0d", borderColor: colors.primary + "4d", opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={[styles.generateIcon, { backgroundColor: colors.primary + "26" }]}>
                <Feather name="star" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.generateText, { color: colors.foreground, fontFamily: Fonts.sans }]}>
                Ready to plan? Turn these {localAssignments.length} assignments into a balanced schedule.
              </Text>
              <View style={[styles.generateBtn, { backgroundColor: colors.primary }]}>
                <Text style={[styles.generateBtnText, { color: colors.primaryForeground, fontFamily: Fonts.sansBold }]}>
                  Generate
                </Text>
                <Feather name="arrow-right" size={14} color={colors.primaryForeground} />
              </View>
            </Pressable>

            {localAssignments.map((a) => (
              <AssignmentRow
                key={a.id}
                a={a}
                onDelete={() => handleDelete(a.id)}
                colors={colors}
              />
            ))}
          </View>
        )}

        <View style={{ gap: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: Fonts.headingSemibold }]}>
            Connect a tool
          </Text>

          <View style={styles.tilesGrid}>
            {TOOLS.map((tool) => {
              const isOpen = openPanel === tool.id;
              const bg = iconBgColor(tool.iconBg, colors.primary);
              const ic = iconColor(tool.iconBg, colors.primary);
              return (
                <Pressable
                  key={tool.id}
                  onPress={() => togglePanel(tool.id)}
                  style={({ pressed }) => [
                    styles.tile,
                    {
                      backgroundColor: colors.card,
                      borderColor: isOpen ? colors.primary : colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                    isOpen && { borderWidth: 1.5 },
                  ]}
                >
                  <View style={[styles.tileIconBox, { backgroundColor: bg }]}>
                    <Feather name={tool.iconName as any} size={32} color={ic} />
                  </View>
                  <Text
                    style={[styles.tileName, { color: colors.foreground, fontFamily: Fonts.sansMedium }]}
                    numberOfLines={2}
                  >
                    {tool.name}
                  </Text>
                  {tool.badgeText && (
                    <View style={[styles.tileBadge, { backgroundColor: "#3b82f6" }]}>
                      <Text style={[styles.tileBadgeText, { fontFamily: Fonts.sansBold }]}>
                        {tool.badgeText}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {activeTool && openPanel !== "focusguard" && (
            <View style={[styles.panelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable onPress={() => setOpenPanel(null)} style={styles.panelHeader}>
                <View style={[styles.panelIconBox, { backgroundColor: iconBgColor(activeTool.iconBg, colors.primary) }]}>
                  <Feather name={activeTool.iconName as any} size={20} color={iconColor(activeTool.iconBg, colors.primary)} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.panelTitleRow}>
                    <Text style={[styles.panelTitle, { color: colors.foreground, fontFamily: Fonts.sansBold }]}>
                      {activeTool.name}
                    </Text>
                    {activeTool.badgeText && (
                      <View style={[styles.panelBadge, { backgroundColor: "#3b82f6" }]}>
                        <Text style={[styles.panelBadgeText, { fontFamily: Fonts.sansBold }]}>
                          {activeTool.badgeText}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.panelDesc, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
                    {activeTool.description}
                  </Text>
                </View>
                <Feather name="chevron-up" size={20} color={colors.mutedForeground} />
              </Pressable>
              <View style={[styles.panelBody, { borderTopColor: colors.border }]}>
                <PanelContent id={openPanel!} colors={colors} />
              </View>
            </View>
          )}

          {openPanel === "focusguard" && (
            <View style={[styles.panelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable onPress={() => setOpenPanel(null)} style={styles.panelHeader}>
                <View style={[styles.panelIconBox, { backgroundColor: colors.primary + "1a" }]}>
                  <Feather name="shield" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.panelTitle, { color: colors.foreground, fontFamily: Fonts.sansBold }]}>
                    Focus Guard
                  </Text>
                  <Text style={[styles.panelDesc, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
                    Blocks distracting sites while you're supposed to be working
                  </Text>
                </View>
                <Feather name="chevron-up" size={20} color={colors.mutedForeground} />
              </Pressable>
              <View style={[styles.panelBody, { borderTopColor: colors.border }]}>
                <PanelContent id="focusguard" colors={colors} />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { gap: 8 },
  headerTitle: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontSize: 30 },
  pageSubtitle: { fontSize: 16, lineHeight: 24, marginLeft: 52 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 20 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countBadgeText: { fontSize: 12 },
  generateCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  generateIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  generateText: { flex: 1, fontSize: 13, lineHeight: 18 },
  generateBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  generateBtnText: { fontSize: 12 },
  assignmentRow: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  assignmentMain: { flexDirection: "row", alignItems: "center", padding: 14, gap: 8 },
  assignmentTitle: { fontSize: 15, marginBottom: 3 },
  assignmentMeta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  assignmentCourse: { fontSize: 12 },
  assignmentDue: { fontSize: 12 },
  sourceBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  sourceBadgeText: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.3 },
  expandedRow: { padding: 14, borderTopWidth: 1 },
  expandedText: { fontSize: 13, lineHeight: 18 },
  tilesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: {
    width: "47%",
    aspectRatio: 2,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 12,
    overflow: "hidden",
    position: "relative",
  },
  tileIconBox: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  tileName: { fontSize: 13, textAlign: "center", lineHeight: 17 },
  tileBadge: { position: "absolute", top: 6, right: 6, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  tileBadgeText: { fontSize: 9, color: "#fff" },
  panelCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  panelHeader: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  panelIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  panelTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  panelTitle: { fontSize: 15 },
  panelBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  panelBadgeText: { fontSize: 9, color: "#fff" },
  panelDesc: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  panelBody: { padding: 16, borderTopWidth: 1, gap: 12 },
  panelText: { fontSize: 14, lineHeight: 20 },
  formField: { gap: 4 },
  label: { fontSize: 13 },
  input: { height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  connectBtnText: { fontSize: 15 },
  redirectNote: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12 },
  redirectText: { fontSize: 13, flex: 1, lineHeight: 18 },
});
