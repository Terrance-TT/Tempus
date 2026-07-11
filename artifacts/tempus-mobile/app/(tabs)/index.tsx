import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Assignment,
  ScheduleBlock,
  blockTypeColor,
  formatDuration,
  getTodayBlocks,
  useApp,
} from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function greetingFor(name: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Good morning, ${name}`;
  if (h < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function BlockRow({ block, colors }: { block: ScheduleBlock; colors: ReturnType<typeof useColors> }) {
  const color = blockTypeColor(block.type, colors.primary, colors.accent);
  const now = new Date();
  const curMin = now.getHours() * 60 + now.getMinutes();
  const startMin = timeToMinutes(block.startTime);
  const endMin = timeToMinutes(block.endTime);
  const isActive = curMin >= startMin && curMin < endMin;
  const isPast = curMin >= endMin;

  return (
    <View style={[styles.blockRow, { opacity: isPast ? 0.5 : 1 }]}>
      <View style={[styles.blockDot, { backgroundColor: color }]} />
      <View style={styles.blockInfo}>
        <Text style={[styles.blockTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
          {block.title}
        </Text>
        <Text style={[styles.blockTime, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {formatTime(block.startTime)} – {formatTime(block.endTime)}
        </Text>
      </View>
      {isActive && (
        <View style={[styles.activePill, { backgroundColor: color + "20" }]}>
          <View style={[styles.activeDot, { backgroundColor: color }]} />
          <Text style={[styles.activeText, { color, fontFamily: "Inter_600SemiBold" }]}>Now</Text>
        </View>
      )}
    </View>
  );
}

function AssignmentChip({ assignment, colors }: { assignment: Assignment; colors: ReturnType<typeof useColors> }) {
  const isToday = (() => {
    const due = new Date(assignment.dueDate);
    const t = new Date();
    return due.getDate() === t.getDate() && due.getMonth() === t.getMonth() && due.getFullYear() === t.getFullYear();
  })();

  return (
    <View style={[styles.assignmentChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.chipCourse, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
        {assignment.course.split(" ").slice(-1)[0]}
      </Text>
      <Text style={[styles.chipTitle, { color: colors.foreground, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
        {assignment.title}
      </Text>
      {isToday && (
        <View style={[styles.dueTodayBadge, { backgroundColor: colors.destructive + "15" }]}>
          <Text style={[styles.dueTodayText, { color: colors.destructive, fontFamily: "Inter_600SemiBold" }]}>Due today</Text>
        </View>
      )}
    </View>
  );
}

export default function TodayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { activeSchedule, todayStudySeconds, assignments, preferences } = useApp();

  const todayBlocks = useMemo(() => getTodayBlocks(activeSchedule), [activeSchedule]);
  const now = new Date();
  const curMin = now.getHours() * 60 + now.getMinutes();

  const upcomingBlocks = useMemo(
    () => todayBlocks.filter((b) => timeToMinutes(b.endTime) > curMin).slice(0, 5),
    [todayBlocks, curMin]
  );

  const dueAssignments = useMemo(
    () => assignments.filter((a) => !a.completed).slice(0, 3),
    [assignments]
  );

  const goalSeconds = preferences.dailyGoalHours * 3600;
  const goalProgress = Math.min(todayStudySeconds / goalSeconds, 1);
  const studyFormatted = formatDuration(todayStudySeconds);

  const handleStartFocus = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/focus/session");
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const day = DAY_NAMES[now.getDay()];
  const date = `${MONTH_NAMES[now.getMonth()]} ${now.getDate()}`;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: botPad + 100 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[colors.primary + "22", colors.background]}
        style={[styles.headerGradient, { paddingTop: topPad + 20 }]}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.dayText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              {day}, {date}
            </Text>
            <Text style={[styles.greeting, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {greetingFor(preferences.name)}
            </Text>
          </View>
          <Pressable
            onPress={handleStartFocus}
            style={({ pressed }) => [
              styles.focusBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="clock" size={16} color={colors.primaryForeground} />
            <Text style={[styles.focusBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
              Focus
            </Text>
          </Pressable>
        </View>

        <View style={[styles.goalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.goalHeader}>
            <Text style={[styles.goalLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              Today's Study Time
            </Text>
            <Text style={[styles.goalValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {studyFormatted || "0m"} / {preferences.dailyGoalHours}h goal
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.primary, width: `${goalProgress * 100}%` as any },
              ]}
            />
          </View>
          {todayStudySeconds === 0 && (
            <Text style={[styles.goalHint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Start a focus session to track your study time
            </Text>
          )}
        </View>
      </LinearGradient>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Today's Schedule
        </Text>
        {upcomingBlocks.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="calendar" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Nothing scheduled for today
            </Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {upcomingBlocks.map((b, i) => (
              <View key={b.id}>
                <BlockRow block={b} colors={colors} />
                {i < upcomingBlocks.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {dueAssignments.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Upcoming Tasks
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {dueAssignments.map((a) => (
              <AssignmentChip key={a.id} assignment={a} colors={colors} />
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGradient: { paddingHorizontal: 20, paddingBottom: 20 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  dayText: { fontSize: 13, marginBottom: 4 },
  greeting: { fontSize: 22, lineHeight: 28 },
  focusBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  focusBtnText: { fontSize: 14 },
  goalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  goalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  goalLabel: { fontSize: 13 },
  goalValue: { fontSize: 15 },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  goalHint: { fontSize: 12 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 18, marginBottom: 12 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyText: { fontSize: 14 },
  blockRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  blockDot: { width: 8, height: 8, borderRadius: 4 },
  blockInfo: { flex: 1 },
  blockTitle: { fontSize: 15, marginBottom: 2 },
  blockTime: { fontSize: 12 },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  activeText: { fontSize: 11 },
  divider: { height: 1, marginHorizontal: 14 },
  chipRow: { marginHorizontal: -20, paddingHorizontal: 20 },
  assignmentChip: {
    width: 200,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginRight: 10,
    gap: 4,
  },
  chipCourse: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  chipTitle: { fontSize: 14, lineHeight: 20 },
  dueTodayBadge: { alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  dueTodayText: { fontSize: 10 },
});
