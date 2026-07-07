import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useManualRequest } from "@/hooks/useManualRequests";

export default function RequestScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useManualRequest(id ?? null);

  const req = data?.data;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.foreground }]}>Your Request</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={styles.centred}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : !req ? (
          <View style={styles.centred}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Request not found.
            </Text>
          </View>
        ) : req.status === "pending" || req.status === "in_progress" ? (
          <View style={styles.pendingCard}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}18` }]}>
              <Feather name="clock" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.pendingTitle, { color: colors.foreground }]}>
              We're working on it
            </Text>
            <Text style={[styles.pendingSubtitle, { color: colors.mutedForeground }]}>
              {req.status === "pending"
                ? "Your request is in the queue. We'll have your plan ready shortly."
                : "A member of our team is crafting your schedule now."}
            </Text>
            <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
              Submitted {new Date(req.createdAt).toLocaleString()}
            </Text>
          </View>
        ) : req.response ? (
          <View style={styles.responseSection}>
            <View style={[styles.successBadge, { backgroundColor: `${colors.primary}18` }]}>
              <Feather name="check-circle" size={16} color={colors.primary} />
              <Text style={[styles.successBadgeText, { color: colors.primary }]}>
                Your schedule is ready
              </Text>
            </View>

            {req.response.message ? (
              <View style={[styles.messageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.messageText, { color: colors.foreground }]}>
                  "{req.response.message}"
                </Text>
              </View>
            ) : null}

            {req.response.graphicPath ? (
              <View style={[styles.imageCard, { borderColor: colors.border }]}>
                <Image
                  source={{ uri: req.response.graphicPath }}
                  style={styles.scheduleImage}
                  resizeMode="contain"
                />
              </View>
            ) : null}

            {req.response.scheduleContent ? (
              <View style={[styles.contentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.contentLabel, { color: colors.mutedForeground }]}>
                  YOUR PLAN
                </Text>
                <Text style={[styles.contentText, { color: colors.foreground }]}>
                  {req.response.scheduleContent}
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.centred}>
            <Feather name="clock" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No response yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: { padding: 4 },
  topBarTitle: { fontSize: 18, fontWeight: "600" },
  content: {
    padding: 24,
    gap: 16,
    paddingBottom: 60,
  },
  centred: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: { fontSize: 15, textAlign: "center" },
  pendingCard: {
    alignItems: "center",
    paddingTop: 40,
    gap: 12,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  pendingTitle: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  pendingSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  timestamp: { fontSize: 12, marginTop: 8 },
  responseSection: { gap: 16 },
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  successBadgeText: { fontSize: 13, fontWeight: "600" },
  messageCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  messageText: { fontSize: 15, lineHeight: 22, fontStyle: "italic" },
  imageCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  scheduleImage: { width: "100%", height: 300 },
  contentCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  contentLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  contentText: { fontSize: 14, lineHeight: 22 },
});
