import React from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useDeviceId } from "@/hooks/useDeviceId";
import { useGetSchedule, DayOfWeek, ScheduleBlockCategory } from "@workspace/api-client-react";

const DAY_ORDER: DayOfWeek[] = [
  DayOfWeek.mon,
  DayOfWeek.tue,
  DayOfWeek.wed,
  DayOfWeek.thu,
  DayOfWeek.fri,
  DayOfWeek.sat,
  DayOfWeek.sun,
];

const DAY_LABEL: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const CATEGORY_LABEL: Record<string, string> = {
  class: "Class",
  extracurricular: "Activity",
  routine: "Routine",
  homework: "Homework",
  break: "Break",
  free: "Free time",
};

function categoryColor(colors: ReturnType<typeof useColors>, category: string) {
  switch (category) {
    case ScheduleBlockCategory.class:
      return colors.primary;
    case ScheduleBlockCategory.extracurricular:
      return colors.accentForeground;
    case ScheduleBlockCategory.homework:
      return colors.destructive;
    case ScheduleBlockCategory.routine:
      return colors.tint;
    case ScheduleBlockCategory.break:
      return colors.mutedForeground;
    default:
      return colors.mutedForeground;
  }
}

export default function ScheduleScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { deviceId } = useDeviceId();

  const { data: schedule, isLoading } = useGetSchedule(
    id ?? "",
    { deviceId: deviceId ?? "" },
    {
      query: { enabled: !!id && !!deviceId } as any,
    },
  );

  if (isLoading || !schedule) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {Platform.OS === "web" ? <WebHeader colors={colors} onBack={() => router.back()} /> : null}
        <ActivityIndicator color={colors.primary} style={{ marginTop: 80 }} />
      </View>
    );
  }

  const daysPresent = DAY_ORDER.filter((day) =>
    schedule.blocks.some((b) => b.day === day)
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {Platform.OS === "web" ? <WebHeader colors={colors} onBack={() => router.back()} /> : null}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>
            {schedule.scope === "week" ? "This week" : "Today"}
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Your schedule
          </Text>
        </View>

        {daysPresent.length === 0 && (
          <Text style={{ color: colors.mutedForeground, marginTop: 20 }}>
            No blocks in this schedule yet.
          </Text>
        )}

        {daysPresent.map((day) => {
          const blocks = schedule.blocks
            .filter((b) => b.day === day)
            .slice()
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

          return (
            <View key={day} style={styles.daySection}>
              <Text style={[styles.dayHeading, { color: colors.foreground }]}>
                {DAY_LABEL[day] ?? day}
              </Text>
              <View style={styles.blockList}>
                {blocks.map((block) => (
                  <View
                    key={block.id}
                    style={[
                      styles.blockRow,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.blockAccent,
                        { backgroundColor: categoryColor(colors, block.category) },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <View style={styles.blockTopRow}>
                        <Text style={[styles.blockTitle, { color: colors.cardForeground }]}>
                          {block.title}
                        </Text>
                        <Text style={[styles.blockTime, { color: colors.mutedForeground }]}>
                          {block.startTime}–{block.endTime}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.blockCategory,
                          { color: categoryColor(colors, block.category) },
                        ]}
                      >
                        {CATEGORY_LABEL[block.category] ?? block.category}
                      </Text>
                      {block.notes ? (
                        <Text style={[styles.blockNotes, { color: colors.mutedForeground }]}>
                          {block.notes}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        <Pressable
          style={[styles.regenerateButton, { borderColor: colors.border }]}
          onPress={() => router.push("/generate")}
        >
          <Feather name="refresh-cw" size={16} color={colors.foreground} />
          <Text style={[styles.regenerateText, { color: colors.foreground }]}>
            Regenerate
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function WebHeader({
  colors,
  onBack,
}: {
  colors: ReturnType<typeof useColors>;
  onBack: () => void;
}) {
  return (
    <View
      style={[
        webHeaderStyles.container,
        { backgroundColor: colors.background, borderBottomColor: colors.border },
      ]}
    >
      <Pressable
        onPress={onBack}
        style={webHeaderStyles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Feather name="arrow-left" size={20} color={colors.foreground} />
      </Pressable>
      <Text style={[webHeaderStyles.title, { color: colors.foreground }]}>Schedule</Text>
      <View style={webHeaderStyles.spacer} />
    </View>
  );
}

const webHeaderStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    marginRight: 40,
  },
  spacer: {
    width: 40,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 80,
    gap: 8,
  },
  header: {
    gap: 4,
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  daySection: {
    marginTop: 20,
    gap: 10,
  },
  dayHeading: {
    fontSize: 17,
    fontWeight: "700",
  },
  blockList: {
    gap: 8,
  },
  blockRow: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  blockAccent: {
    width: 4,
  },
  blockTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 14,
    paddingBottom: 4,
    gap: 8,
  },
  blockTitle: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  blockTime: {
    fontSize: 13,
    fontWeight: "500",
  },
  blockCategory: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    paddingHorizontal: 14,
  },
  blockNotes: {
    fontSize: 13,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 4,
  },
  regenerateButton: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 28,
  },
  regenerateText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
