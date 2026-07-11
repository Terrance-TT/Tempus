import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FocusSession, useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

type SessionType = "pomodoro" | "extended" | "custom";

const SESSION_DURATIONS: Record<SessionType, number> = {
  pomodoro: 25 * 60,
  extended: 50 * 60,
  custom: 30 * 60,
};

const SESSION_LABELS: Record<SessionType, string> = {
  pomodoro: "Pomodoro",
  extended: "Extended",
  custom: "Custom",
};

const RING_SIZE = 260;
const STROKE = 10;
const R = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

const MOTIVATIONAL_MSGS = [
  "Deep work builds mastery.",
  "Every minute counts.",
  "Stay present. Stay focused.",
  "You're building momentum.",
  "Consistency beats intensity.",
];

export default function SessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addFocusSession } = useApp();
  const params = useLocalSearchParams<{ type?: string }>();
  const sessionType: SessionType =
    (params.type as SessionType) && ["pomodoro", "extended", "custom"].includes(params.type as string)
      ? (params.type as SessionType)
      : "pomodoro";

  const totalSeconds = SESSION_DURATIONS[sessionType];
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const startedAtRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgIdx = useRef(Math.floor(Math.random() * MOTIVATIONAL_MSGS.length)).current;

  const elapsed = totalSeconds - remaining;
  const progress = elapsed / totalSeconds;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setRunning(true);
    setStarted(true);
    if (!startedAtRef.current) startedAtRef.current = new Date().toISOString();
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearTimer();
          setRunning(false);
          setFinished(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  };

  const handlePause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRunning(false);
    clearTimer();
  };

  const handleEnd = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearTimer();
    setRunning(false);
    if (elapsed >= 60 && startedAtRef.current) {
      const session: FocusSession = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        startedAt: startedAtRef.current,
        endedAt: new Date().toISOString(),
        durationSeconds: elapsed,
        type: sessionType,
        completed: finished || elapsed >= totalSeconds * 0.9,
      };
      await addFocusSession(session);
    }
    router.back();
  };

  const handleConfirmEnd = () => {
    if (!started || elapsed < 60) {
      router.back();
      return;
    }
    Alert.alert(
      "End Session?",
      `You've focused for ${Math.floor(elapsed / 60)}m. Save this session?`,
      [
        { text: "Discard", style: "destructive", onPress: () => router.back() },
        { text: "Save & Exit", onPress: handleEnd },
      ]
    );
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <LinearGradient
      colors={[colors.background, colors.primary + "18", colors.background]}
      style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}
    >
      <View style={styles.topBar}>
        <Pressable onPress={handleConfirmEnd} style={styles.closeBtn} hitSlop={12}>
          <Feather name="x" size={22} color={colors.foreground} />
        </Pressable>
        <View style={[styles.typePill, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[styles.typePillText, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
            {SESSION_LABELS[sessionType]}
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.body}>
        {finished ? (
          <View style={styles.finishedContent}>
            <View style={[styles.finishedIcon, { backgroundColor: colors.primary + "20" }]}>
              <Feather name="check" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.finishedTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Session Complete!
            </Text>
            <Text style={[styles.finishedSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              You focused for {SESSION_LABELS[sessionType].toLowerCase()}
            </Text>
            <Pressable
              onPress={handleEnd}
              style={({ pressed }) => [
                styles.doneBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.doneBtnText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>
                Save Session
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.timerSection}>
              <Svg width={RING_SIZE} height={RING_SIZE} style={styles.svg}>
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
              <View style={styles.timerCenter}>
                <Text style={[styles.timerText, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {formatTime(remaining)}
                </Text>
                <Text style={[styles.elapsedText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {started ? `${Math.floor(elapsed / 60)}m elapsed` : "Ready"}
                </Text>
              </View>
            </View>

            <Text style={[styles.motivational, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {MOTIVATIONAL_MSGS[msgIdx % MOTIVATIONAL_MSGS.length]}
            </Text>

            <View style={styles.controls}>
              {!started ? (
                <Pressable
                  onPress={handleStart}
                  style={({ pressed }) => [
                    styles.primaryControl,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Feather name="play" size={24} color={colors.primaryForeground} />
                  <Text style={[styles.primaryControlText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>
                    Start
                  </Text>
                </Pressable>
              ) : running ? (
                <View style={styles.activeControls}>
                  <Pressable
                    onPress={handlePause}
                    style={({ pressed }) => [
                      styles.secondaryControl,
                      { backgroundColor: colors.secondary, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Feather name="pause" size={22} color={colors.foreground} />
                  </Pressable>
                  <Pressable
                    onPress={handleConfirmEnd}
                    style={({ pressed }) => [
                      styles.endControl,
                      { borderColor: colors.destructive + "40", opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Feather name="square" size={18} color={colors.destructive} />
                    <Text style={[styles.endControlText, { color: colors.destructive, fontFamily: "Inter_600SemiBold" }]}>
                      End
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.activeControls}>
                  <Pressable
                    onPress={handleStart}
                    style={({ pressed }) => [
                      styles.primaryControl,
                      { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <Feather name="play" size={24} color={colors.primaryForeground} />
                    <Text style={[styles.primaryControlText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>
                      Resume
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleConfirmEnd}
                    style={({ pressed }) => [
                      styles.endControl,
                      { borderColor: colors.destructive + "40", opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Feather name="square" size={18} color={colors.destructive} />
                    <Text style={[styles.endControlText, { color: colors.destructive, fontFamily: "Inter_600SemiBold" }]}>
                      End
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  typePill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  typePillText: { fontSize: 13 },
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 32 },
  timerSection: { width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center" },
  svg: { position: "absolute" },
  timerCenter: { alignItems: "center" },
  timerText: { fontSize: 56, lineHeight: 64 },
  elapsedText: { fontSize: 15, marginTop: 4 },
  motivational: { fontSize: 15, textAlign: "center", fontStyle: "italic" },
  controls: { width: "100%" },
  primaryControl: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 28,
    width: "100%",
  },
  primaryControlText: { fontSize: 18 },
  activeControls: { flexDirection: "row", gap: 12, width: "100%" },
  secondaryControl: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 28,
    borderWidth: 1,
  },
  endControl: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
    borderRadius: 28,
    borderWidth: 1,
  },
  endControlText: { fontSize: 16 },
  finishedContent: { alignItems: "center", gap: 16 },
  finishedIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  finishedTitle: { fontSize: 28 },
  finishedSub: { fontSize: 16 },
  doneBtn: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 28,
    marginTop: 16,
  },
  doneBtnText: { fontSize: 17 },
});
