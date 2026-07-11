import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DotPattern } from "@/components/DotPattern";
import { Schedule, useApp } from "@/contexts/AppContext";
import { Fonts } from "@/constants/fonts";
import { useColors } from "@/hooks/useColors";

function PlanPill({
  plan,
  onPress,
  onDelete,
  colors,
}: {
  plan: Schedule;
  onPress: () => void;
  onDelete: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.planPill,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.planPillDot, { backgroundColor: colors.primary + "99" }]} />
      <View style={[styles.planPillCircle, { backgroundColor: colors.primary + "66" }]} />
      <Text
        style={[styles.planPillName, { color: colors.foreground, fontFamily: Fonts.heading }]}
        numberOfLines={1}
      >
        {plan.name}
      </Text>
      <View style={{ flex: 1 }} />
      <Pressable
        onPress={onDelete}
        hitSlop={12}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <Feather name="trash-2" size={16} color={colors.mutedForeground} />
      </Pressable>
      <View style={[styles.planPillEndCircle, { backgroundColor: colors.primary + "1a" }]}>
        <Feather name="chevron-right" size={16} color={colors.primary + "80"} />
      </View>
    </Pressable>
  );
}

export default function PlansScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { schedules, activeSchedule } = useApp();
  const [plans, setPlans] = useState(schedules);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 84 : insets.bottom + 60;

  const hasActivePlan = plans.some((p) => p);

  const handleAddPickup = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Pickup Games added! ⚽",
      "Today, 7:00pm at Lerner Hall Field.",
      [{ text: "OK" }]
    );
  };

  const handleDeletePlan = (id: string) => {
    Alert.alert("Delete this plan?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => setPlans((prev) => prev.filter((p) => p.id !== id)),
      },
    ]);
  };

  const handleCreatePlan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Create a plan", "Open the Tempus web app to use the full AI schedule builder.");
  };

  const pageTitle = hasActivePlan ? "Today" : "Welcome to Tempus";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <DotPattern />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: topPad + 48,
          paddingHorizontal: 20,
          paddingBottom: botPad,
          gap: 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: Fonts.heading }]}>
            {pageTitle}
          </Text>
          <Text style={[styles.pageSubtitle, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
            Your AI-powered study planner.
          </Text>
        </View>

        {hasActivePlan && (
          <Pressable
            onPress={handleAddPickup}
            style={({ pressed }) => [styles.pickupCard, { opacity: pressed ? 0.92 : 1 }]}
          >
            <LinearGradient
              colors={["#10b981", "#22c55e", "#84cc16"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.pickupLabel}>Quick add</Text>
            <View style={styles.pickupContent}>
              <View style={styles.pickupIconBox}>
                <Text style={styles.pickupEmoji}>⚽</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pickupTitle, { fontFamily: Fonts.heading }]}>
                  Pickup Games
                </Text>
                <View style={styles.pickupMeta}>
                  <Feather name="clock" size={13} color="rgba(255,255,255,0.9)" />
                  <Text style={[styles.pickupMetaText, { fontFamily: Fonts.sansMedium }]}>
                    Today, 7:00pm
                  </Text>
                  <Feather name="map-pin" size={13} color="rgba(255,255,255,0.9)" />
                  <Text style={[styles.pickupMetaText, { fontFamily: Fonts.sansMedium }]}>
                    Lerner Hall Field
                  </Text>
                </View>
              </View>
              <View style={styles.pickupAddBtn}>
                <Feather name="plus" size={14} color="#059669" />
                <Text style={[styles.pickupAddText, { fontFamily: Fonts.sansBold }]}>
                  Add to schedule
                </Text>
              </View>
            </View>
          </Pressable>
        )}

        {!hasActivePlan ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.secondary + "1a", borderColor: colors.border },
            ]}
          >
            <View style={[styles.emptyGlow, { backgroundColor: colors.primary + "1a" }]} />
            <View style={[styles.emptyIconRing, { backgroundColor: colors.primary + "1a", borderColor: colors.primary + "33" }]}>
              <Feather name="star" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: Fonts.heading }]}>
              Ready to get organized?
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
              Snap a photo of your class timetable, tell us what's due, and we'll build a balanced schedule for you in seconds.
            </Text>
            <Pressable
              onPress={handleCreatePlan}
              style={({ pressed }) => [
                styles.createBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Feather name="plus-circle" size={18} color={colors.primaryForeground} />
              <Text style={[styles.createBtnText, { color: colors.primaryForeground, fontFamily: Fonts.sansBold }]}>
                Create Your First Plan
              </Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <Pressable
              onPress={handleCreatePlan}
              style={({ pressed }) => [
                styles.newPlanBtn,
                { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={[styles.newPlanBtnInner, { backgroundColor: colors.primary + "1a" }]}>
                <Feather name="plus" size={28} color={colors.primary} />
              </View>
            </Pressable>
          </View>
        )}

        {plans.length > 0 && (
          <View style={styles.plansSection}>
            <View style={styles.plansSectionHeader}>
              <Text style={[styles.plansSectionTitle, { color: colors.foreground, fontFamily: Fonts.headingSemibold }]}>
                Current plans
              </Text>
              <Text style={[styles.plansSectionCount, { color: colors.mutedForeground, fontFamily: Fonts.sans }]}>
                {plans.length} {plans.length === 1 ? "plan" : "plans"}
              </Text>
            </View>
            <View style={{ gap: 8 }}>
              {plans.map((plan) => (
                <PlanPill
                  key={plan.id}
                  plan={plan}
                  colors={colors}
                  onPress={() =>
                    Alert.alert(plan.name, `${plan.blocks.length} blocks in this plan.`)
                  }
                  onDelete={() => handleDeletePlan(plan.id)}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { gap: 4 },
  pageTitle: { fontSize: 36, lineHeight: 42 },
  pageSubtitle: { fontSize: 17, lineHeight: 24 },
  pickupCard: {
    borderRadius: 24,
    overflow: "hidden",
    padding: 20,
    shadowColor: "#10b981",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pickupLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
    marginBottom: 8,
    fontFamily: "DmSans_700Bold",
  },
  pickupContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  pickupIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  pickupEmoji: { fontSize: 28 },
  pickupTitle: { fontSize: 22, color: "#fff", lineHeight: 26 },
  pickupMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4, flexWrap: "wrap" },
  pickupMetaText: { fontSize: 12, color: "rgba(255,255,255,0.9)" },
  pickupAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pickupAddText: { fontSize: 12, color: "#059669" },
  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 32,
    alignItems: "center",
    gap: 16,
    overflow: "hidden",
  },
  emptyGlow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    top: "50%",
    left: "50%",
    marginTop: -100,
    marginLeft: -100,
  },
  emptyIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 22, textAlign: "center" },
  emptyDesc: { fontSize: 16, textAlign: "center", lineHeight: 24 },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 14,
    width: "100%",
    justifyContent: "center",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  createBtnText: { fontSize: 17 },
  newPlanBtn: {
    aspectRatio: 2,
    width: "50%",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  newPlanBtnInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  plansSection: { gap: 12 },
  plansSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  plansSectionTitle: { fontSize: 20 },
  plansSectionCount: { fontSize: 13 },
  planPill: {
    flexDirection: "row",
    alignItems: "center",
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    paddingLeft: 8,
    paddingRight: 8,
    gap: 4,
  },
  planPillDot: { width: 12, height: 36, borderRadius: 6 },
  planPillCircle: { width: 40, height: 40, borderRadius: 20, marginLeft: -8, marginRight: 4 },
  planPillName: { fontSize: 17, maxWidth: 160 },
  planPillEndCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
