import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Assignment, useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

const SOURCE_COLORS: Record<string, string> = {
  canvas: "#E66000",
  schoology: "#1B3FA0",
  classroom: "#1A73E8",
  manual: "#5c7069",
};

const SOURCE_LABELS: Record<string, string> = {
  canvas: "Canvas",
  schoology: "Schoology",
  classroom: "Classroom",
  manual: "Manual",
};

function daysUntil(iso: string): number {
  const due = new Date(iso);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86400000);
}

function dueDateLabel(days: number): string {
  if (days < 0) return "Overdue";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

function AssignmentCard({
  assignment,
  onToggle,
  colors,
}: {
  assignment: Assignment;
  onToggle: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const days = daysUntil(assignment.dueDate);
  const isOverdue = days < 0;
  const isUrgent = days <= 1 && !assignment.completed;
  const sourceColor = SOURCE_COLORS[assignment.source];

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isUrgent ? colors.destructive + "30" : colors.border,
        },
      ]}
    >
      <Pressable onPress={handleToggle} style={styles.checkbox} hitSlop={8}>
        <View
          style={[
            styles.checkboxInner,
            {
              borderColor: assignment.completed ? colors.primary : colors.border,
              backgroundColor: assignment.completed ? colors.primary : "transparent",
            },
          ]}
        >
          {assignment.completed && (
            <Feather name="check" size={11} color={colors.primaryForeground} />
          )}
        </View>
      </Pressable>

      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={[
            styles.assignmentTitle,
            {
              color: assignment.completed ? colors.mutedForeground : colors.foreground,
              fontFamily: "Inter_600SemiBold",
              textDecorationLine: assignment.completed ? "line-through" : "none",
            },
          ]}
          numberOfLines={2}
        >
          {assignment.title}
        </Text>
        <Text style={[styles.courseText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {assignment.course}
          {assignment.points ? ` · ${assignment.points} pts` : ""}
        </Text>
        <View style={styles.badges}>
          <View style={[styles.sourceBadge, { backgroundColor: sourceColor + "18" }]}>
            <Text style={[styles.sourceBadgeText, { color: sourceColor, fontFamily: "Inter_600SemiBold" }]}>
              {SOURCE_LABELS[assignment.source]}
            </Text>
          </View>
          {!assignment.completed && (
            <View
              style={[
                styles.dueBadge,
                {
                  backgroundColor: isOverdue
                    ? colors.destructive + "15"
                    : isUrgent
                    ? colors.accent + "20"
                    : colors.muted,
                },
              ]}
            >
              <Text
                style={[
                  styles.dueBadgeText,
                  {
                    color: isOverdue ? colors.destructive : isUrgent ? colors.accent : colors.mutedForeground,
                    fontFamily: "Inter_600SemiBold",
                  },
                ]}
              >
                {dueDateLabel(days)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const FILTERS = ["All", "Canvas", "Schoology", "Classroom"] as const;
type Filter = (typeof FILTERS)[number];

export default function AssignmentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { assignments, toggleAssignment } = useApp();
  const [filter, setFilter] = useState<Filter>("All");
  const [showCompleted, setShowCompleted] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const filtered = useMemo(() => {
    let list = assignments;
    if (filter !== "All") list = list.filter((a) => a.source === filter.toLowerCase());
    if (!showCompleted) list = list.filter((a) => !a.completed);
    return list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [assignments, filter, showCompleted]);

  const grouped = useMemo(() => {
    const groups: { label: string; items: Assignment[] }[] = [];
    const overdue: Assignment[] = [];
    const today: Assignment[] = [];
    const thisWeek: Assignment[] = [];
    const later: Assignment[] = [];
    const done: Assignment[] = [];

    filtered.forEach((a) => {
      if (a.completed) { done.push(a); return; }
      const d = daysUntil(a.dueDate);
      if (d < 0) overdue.push(a);
      else if (d === 0) today.push(a);
      else if (d <= 7) thisWeek.push(a);
      else later.push(a);
    });

    if (overdue.length) groups.push({ label: "Overdue", items: overdue });
    if (today.length) groups.push({ label: "Due Today", items: today });
    if (thisWeek.length) groups.push({ label: "This Week", items: thisWeek });
    if (later.length) groups.push({ label: "Later", items: later });
    if (done.length && showCompleted) groups.push({ label: "Completed", items: done });
    return groups;
  }, [filtered, showCompleted]);

  const completedCount = assignments.filter((a) => a.completed).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Tasks
          </Text>
          <Pressable
            onPress={() => setShowCompleted((v) => !v)}
            style={[styles.completedToggle, { backgroundColor: colors.muted }]}
          >
            <Text style={[styles.completedToggleText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              {showCompleted ? "Hide" : `Done (${completedCount})`}
            </Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <View style={{ flexDirection: "row", gap: 8, paddingBottom: 4 }}>
            {FILTERS.map((f) => (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: filter === f ? colors.primary : colors.muted,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: filter === f ? colors.primaryForeground : colors.mutedForeground,
                      fontFamily: filter === f ? "Inter_600SemiBold" : "Inter_400Regular",
                    },
                  ]}
                >
                  {f}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: botPad + 100, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {grouped.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="check-circle" size={32} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              All caught up!
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Connect Canvas or Schoology to import your assignments
            </Text>
          </View>
        ) : (
          grouped.map((group) => (
            <View key={group.label}>
              <Text style={[styles.groupLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                {group.label.toUpperCase()}
              </Text>
              <View style={{ gap: 8 }}>
                {group.items.map((a) => (
                  <AssignmentCard
                    key={a.id}
                    assignment={a}
                    onToggle={() => toggleAssignment(a.id)}
                    colors={colors}
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 10, borderBottomWidth: 1 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 28 },
  completedToggle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  completedToggleText: { fontSize: 13 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  filterText: { fontSize: 13 },
  groupLabel: { fontSize: 11, letterSpacing: 0.8, marginBottom: 10 },
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  checkbox: { paddingTop: 2 },
  checkboxInner: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  assignmentTitle: { fontSize: 15, lineHeight: 20 },
  courseText: { fontSize: 12 },
  badges: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 2 },
  sourceBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  sourceBadgeText: { fontSize: 10 },
  dueBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  dueBadgeText: { fontSize: 10 },
  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 40,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 18, marginTop: 4 },
  emptyText: { fontSize: 14, textAlign: "center" },
});
