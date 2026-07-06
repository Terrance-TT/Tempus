import { StyleSheet, Text, View, ActivityIndicator, Pressable, ScrollView } from "react-native";
import { Link, Redirect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useDeviceId } from "@/hooks/useDeviceId";
import { useListCommitments, useListSchedules } from "@workspace/api-client-react";

export default function HomeScreen() {
  const colors = useColors();
  const { deviceId, isLoading: deviceLoading } = useDeviceId();
  
  const { data: commitments, isLoading: commitmentsLoading } = useListCommitments(
    { deviceId: deviceId || "" },
    { query: { enabled: !!deviceId } as any }
  );

  const { data: schedules, isLoading: schedulesLoading } = useListSchedules(
    { deviceId: deviceId || "" },
    { query: { enabled: !!deviceId } as any }
  );

  if (deviceLoading || commitmentsLoading || schedulesLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (commitments && commitments.length === 0) {
    return <Redirect href="/onboarding" />;
  }

  const latestSchedule = schedules && schedules.length > 0 ? schedules[0] : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Your Schedule</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {latestSchedule ? (
          <View style={styles.card}>
            <Text style={{ color: colors.foreground, fontSize: 16, marginBottom: 12 }}>
              Active {latestSchedule.scope} schedule
            </Text>
            <Link href={`/schedule/${latestSchedule.id}`} asChild>
              <Pressable style={[styles.button, { backgroundColor: colors.primary }]}>
                <Text style={{ color: colors.primaryForeground, fontWeight: "600" }}>View Schedule</Text>
              </Pressable>
            </Link>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
              <Feather name="calendar" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No schedule yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Generate your first schedule to start finding focus.
            </Text>
            <Link href="/generate" asChild>
              <Pressable style={[styles.button, { backgroundColor: colors.primary, marginTop: 16 }]}>
                <Text style={{ color: colors.primaryForeground, fontWeight: "600" }}>Generate Schedule</Text>
              </Pressable>
            </Link>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  content: {
    paddingHorizontal: 24,
    gap: 16,
    paddingBottom: 100,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
    marginTop: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
