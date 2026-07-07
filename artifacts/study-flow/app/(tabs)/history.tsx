import { StyleSheet, Text, View, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { Link } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useDeviceId } from "@/hooks/useDeviceId";
import { useListSchedules } from "@workspace/api-client-react";

export default function HistoryScreen() {
  const colors = useColors();
  const { deviceId } = useDeviceId();
  
  const { data: schedules, isLoading } = useListSchedules(
    { deviceId: deviceId || "" },
    { query: { enabled: !!deviceId } as any }
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>History</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {schedules?.map((s) => (
            <Link key={s.id} href={`/schedule/${s.id}`} asChild>
              <Pressable style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.cardForeground }]}>
                  {s.scope} schedule
                </Text>
                <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                  Status: {s.status} • Created: {new Date(s.createdAt).toLocaleDateString()}
                </Text>
              </Pressable>
            </Link>
          ))}
          {schedules?.length === 0 && (
            <Text style={{ textAlign: "center", color: colors.mutedForeground, marginTop: 40 }}>
              No history yet.
            </Text>
          )}
        </ScrollView>
      )}
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
    gap: 12,
    paddingBottom: 120,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "capitalize",
  },
  cardSub: {
    fontSize: 14,
  },
});
