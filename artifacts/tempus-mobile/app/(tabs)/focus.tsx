import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FocusSession, formatDuration, useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

const RING_SIZE = 200;
const STROKE = 12;
const R = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

function StudyRing({
  progress,
  studySeconds,
  goalSeconds,
  colors,
}: {
  progress: number;
  studySeconds: number;
  goalSeconds: number;
  colors: ReturnType<typeof useColors>;
}) {
  const strokeDashoffset = CIRCUMFERENCE * (1 - Math.min(progress, 1));

  return (
    <View style={styles.ringContainer}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ring}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={R}
          stroke={colors.border}
          strokeWidth={STROKE}
          fill="none"
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={R}
          stroke={colors.primary}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={`${CIRCUMFERENCE}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      <View style={styles.ringInner}>
        <Text style={[styles.ringTime, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          {formatDuration(studySeconds) || "0m"}
        </Text>
        <Text style={[styles.ringGoal, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          of {formatDuration(goalSeconds)} goal
        </Text>
      </View>
    </View>
  );
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function WeekChart({
  data,
  maxSeconds,
  colors,
}: {
  data: number[];
  maxSeconds: number;
  colors: ReturnType<typeof useColors>;
}) {
  const todayIdx = ((new Date().getDay() + 6) % 7);

  return (
    <View style={styles.chartContainer}>
      {data.map((s, i) => {
        const height = maxSeconds > 0 ? (s / maxSeconds) * 80 : 0;
        const isToday = i === todayIdx;
        return (
          <View key={i} style={styles.barCol}>
            <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    height: Math.max(height, s > 0 ? 4 : 0),
                    backgroundColor: isToday ? colors.primary : colors.primary + "60",
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.barLabel,
                {
                  color: isToday ? colors.primary : colors.mutedForeground,
                  fontFamily: isToday ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              {DAY_LABELS[i]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function SessionRow({ session, colors }: { session: FocusSession; colors: ReturnType<typeof useColors> }) {
  const date = new Date(session.startedAt);
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });
  const typeLabels = { pomodoro: "Pomodoro", extended: "Extended", custom: "Custom" };

  return (
    <View style={[styles.sessionRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.sessionIcon, { backgroundColor: colors.primary + "20" }]}>
        <Feather name="clock" size={14} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sessionType, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          {typeLabels[session.type]} Session
        </Text>
        <Text style={[styles.sessionDate, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {dateStr} at {timeStr}
        </Text>
      </View>
      <Text style={[styles.sessionDuration, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
        {formatDuration(session.durationSeconds)}
      </Text>
    </View>
  );
}

export default function FocusScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { todayStudySeconds, weekStudySeconds, focusSessions, preferences, streakDays } = useApp();

  const goalSeconds = preferences.dailyGoalHours * 3600;
  const progress = todayStudySeconds / goalSeconds;
  const maxWeek = Math.max(...weekStudySeconds, goalSeconds);
  const recentSessions = focusSessions.slice(0, 10);

  const weekTotal = weekStudySeconds.reduce((s, v) => s + v, 0);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const handleStartSession = (type: "pomodoro" | "extended" | "custom") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/focus/session", params: { type } });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: botPad + 100 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[colors.primary + "18", colors.background]}
        style={[styles.heroSection, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.heroHeader}>
          <View>
            <Text style={[styles.heroTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Focus Guard
            </Text>
            <Text style={[styles.heroSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Your daily study tracker
            </Text>
          </View>
          {streakDays > 0 && (
            <View style={[styles.streakBadge, { backgroundColor: colors.accent + "20" }]}>
              <Feather name="zap" size={14} color={colors.accent} />
              <Text style={[styles.streakText, { color: colors.accent, fontFamily: "Inter_700Bold" }]}>
                {streakDays}
              </Text>
            </View>
          )}
        </View>

        <StudyRing
          progress={progress}
          studySeconds={todayStudySeconds}
          goalSeconds={goalSeconds}
          colors={colors}
        />

        <View style={styles.sessionTypes}>
          {(["pomodoro", "extended", "custom"] as const).map((type) => {
            const labels = { pomodoro: "25 min", extended: "50 min", custom: "Custom" };
            const icons = { pomodoro: "clock", extended: "activity", custom: "sliders" } as const;
            return (
              <Pressable
                key={type}
                onPress={() => handleStartSession(type)}
                style={({ pressed }) => [
                  styles.sessionTypeBtn,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Feather name={icons[type]} size={18} color={colors.primary} />
                <Text style={[styles.sessionTypeName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  {labels[type]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => handleStartSession("pomodoro")}
          style={({ pressed }) => [
            styles.startBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="play" size={18} color={colors.primaryForeground} />
          <Text style={[styles.startBtnText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>
            Start Focus Session
          </Text>
        </Pressable>
      </LinearGradient>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {formatDuration(weekTotal) || "0m"}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            This week
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {streakDays}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Day streak
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {focusSessions.filter((s) => s.completed).length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Sessions
          </Text>
        </View>
      </View>

      <View style={[styles.section, { paddingHorizontal: 20 }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          This Week
        </Text>
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <WeekChart data={weekStudySeconds} maxSeconds={maxWeek} colors={colors} />
        </View>
      </View>

      {recentSessions.length > 0 ? (
        <View style={[styles.section, { paddingHorizontal: 20 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Recent Sessions
          </Text>
          <View style={[styles.sessionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {recentSessions.map((s) => (
              <SessionRow key={s.id} session={s} colors={colors} />
            ))}
          </View>
        </View>
      ) : (
        <View style={[styles.section, { paddingHorizontal: 20 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Recent Sessions
          </Text>
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="clock" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              No sessions yet
            </Text>
            <Text style={[styles.emptyHint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Start a focus session to begin tracking your study time
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroSection: { paddingHorizontal: 20, paddingBottom: 24, alignItems: "center" },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
    marginBottom: 24,
  },
  heroTitle: { fontSize: 28 },
  heroSub: { fontSize: 14, marginTop: 2 },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  streakText: { fontSize: 16 },
  ringContainer: { width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute" },
  ringInner: { alignItems: "center" },
  ringTime: { fontSize: 32, lineHeight: 38 },
  ringGoal: { fontSize: 13, marginTop: 2 },
  sessionTypes: { flexDirection: "row", gap: 10, marginTop: 24, width: "100%" },
  sessionTypeBtn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  sessionTypeName: { fontSize: 13 },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 28,
    marginTop: 16,
    width: "100%",
    justifyContent: "center",
  },
  startBtnText: { fontSize: 17 },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 22 },
  statLabel: { fontSize: 11 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 18, marginBottom: 12 },
  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  chartContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 110 },
  barCol: { flex: 1, alignItems: "center", gap: 6 },
  barTrack: { width: "70%", height: 80, borderRadius: 6, justifyContent: "flex-end", overflow: "hidden" },
  barFill: { borderRadius: 6 },
  barLabel: { fontSize: 11 },
  sessionsCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
  },
  sessionIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sessionType: { fontSize: 14, marginBottom: 2 },
  sessionDate: { fontSize: 12 },
  sessionDuration: { fontSize: 15 },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 36,
    alignItems: "center",
    gap: 8,
  },
  emptyText: { fontSize: 16, marginTop: 4 },
  emptyHint: { fontSize: 13, textAlign: "center" },
});
