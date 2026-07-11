import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScheduleBlock, blockTypeColor, useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function BlockPill({ block, colors }: { block: ScheduleBlock; colors: ReturnType<typeof useColors> }) {
  const color = blockTypeColor(block.type, colors.primary, colors.accent);
  return (
    <View style={[styles.pill, { backgroundColor: color + "15", borderColor: color + "40" }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.pillTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
          {block.title}
        </Text>
        <Text style={[styles.pillTime, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {formatTime(block.startTime)} – {formatTime(block.endTime)}
        </Text>
      </View>
    </View>
  );
}

export default function ScheduleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { schedules, activeSchedule } = useApp();
  const [selectedDay, setSelectedDay] = useState<string>(
    () => DAYS[((new Date().getDay() + 6) % 7)]
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const dayBlocks = activeSchedule?.blocks
    .filter((b) => b.days.includes(selectedDay))
    .sort((a, b) => a.startTime.localeCompare(b.startTime)) ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Schedule
        </Text>
        {activeSchedule && (
          <Text style={[styles.headerSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {activeSchedule.name}
          </Text>
        )}
      </View>

      <View style={[styles.dayStrip, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayStripContent}>
          {DAYS.map((d) => {
            const active = d === selectedDay;
            return (
              <Pressable
                key={d}
                onPress={() => setSelectedDay(d)}
                style={[
                  styles.dayPill,
                  active && { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    { fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular" },
                    { color: active ? colors.primaryForeground : colors.mutedForeground },
                  ]}
                >
                  {d}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: botPad + 100, gap: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {dayBlocks.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="coffee" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              No blocks
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Nothing scheduled for {selectedDay}
            </Text>
          </View>
        ) : (
          dayBlocks.map((b) => <BlockPill key={b.id} block={b} colors={colors} />)
        )}

        {schedules.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              SAVED SCHEDULES
            </Text>
            {schedules.map((s) => (
              <View key={s.id} style={[styles.scheduleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.scheduleName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                    {s.name}
                  </Text>
                  <Text style={[styles.scheduleMeta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {s.blocks.length} blocks
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </View>
            ))}
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.createBtn,
            { borderColor: colors.primary, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="plus" size={18} color={colors.primary} />
          <Text style={[styles.createBtnText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
            Generate new schedule
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 28 },
  headerSub: { fontSize: 14, marginTop: 2 },
  dayStrip: { borderBottomWidth: 1 },
  dayStripContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  dayPill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  dayText: { fontSize: 14 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillTitle: { fontSize: 15, marginBottom: 2 },
  pillTime: { fontSize: 12 },
  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 40,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 16, marginTop: 4 },
  emptyText: { fontSize: 14 },
  sectionLabel: { fontSize: 11, letterSpacing: 0.8, marginBottom: 10 },
  scheduleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  scheduleName: { fontSize: 16, marginBottom: 2 },
  scheduleMeta: { fontSize: 13 },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginTop: 8,
  },
  createBtnText: { fontSize: 15 },
});
