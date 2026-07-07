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
        <View style={styles.brandRow}>
          <View style={[styles.brandIcon, { backgroundColor: colors.primary }]}>
            <Feather name="calendar" size={16} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.brandName, { color: colors.foreground }]}>Tempus</Text>
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Your Schedule</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Your plan for the week, built around your life.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {latestSchedule ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.cardBadge, { backgroundColor: `${colors.primary}18` }]}>
              <Feather name="check-circle" size={14} color={colors.primary} />
              <Text style={[styles.cardBadgeText, { color: colors.primary }]}>
                Active {latestSchedule.scope} plan
              </Text>
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              Ready to view
            </Text>
            <Link href={`/schedule/${latestSchedule.id}`} asChild>
              <Pressable style={[styles.button, { backgroundColor: colors.primary }]}>
                <Text style={{ color: colors.primaryForeground, fontWeight: "600", fontSize: 15 }}>
                  View Schedule
                </Text>
                <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
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
                <Text style={{ color: colors.primaryForeground, fontWeight: "600", fontSize: 15 }}>
                  Generate Schedule
                </Text>
                <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
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
    paddingTop: 72,
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 4,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  brandIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 24,
    gap: 16,
    paddingBottom: 100,
  },
  card: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
  },
  cardBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
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
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  button: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
});
