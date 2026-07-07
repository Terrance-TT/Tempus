import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Animated,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useDeviceId } from "@/hooks/useDeviceId";
import { useCreateCommitment, CommitmentType } from "@workspace/api-client-react";
import { CommitmentForm } from "@/components/CommitmentForm";

type Added = {
  id: string;
  title: string;
  type: CommitmentType;
};

const TYPE_LABEL: Record<string, string> = {
  class: "Class",
  extracurricular: "Activity",
  routine: "Routine",
};

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const { deviceId } = useDeviceId();
  const createCommitment = useCreateCommitment();

  const [showForm, setShowForm] = useState(true);
  const [added, setAdded] = useState<Added[]>([]);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const handleAdd = (data: {
    title: string;
    type: CommitmentType;
    daysOfWeek: any;
    startTime: string;
    endTime: string;
    notes?: string | null;
  }) => {
    if (!deviceId) return;
    createCommitment.mutate(
      { data: { deviceId, ...data } },
      {
        onSuccess: (commitment) => {
          setAdded((prev) => [
            ...prev,
            { id: commitment.id, title: commitment.title, type: commitment.type },
          ]);
          setShowForm(false);
          if (Platform.OS === "web") {
            // Skip the JS-driven Animated pass on web: RN Web's
            // non-native-driver style writes have been the root cause of
            // intermittent "Failed to set an indexed property on
            // 'CSSStyleDeclaration'" crashes elsewhere in this app (see
            // bottom-tabs fix in app/(tabs)/_layout.tsx). This fade is
            // purely cosmetic, so just show it at full opacity.
            fadeAnim.setValue(1);
            return;
          }
          fadeAnim.setValue(0);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          }).start();
        },
      }
    );
  };

  const handleFinish = () => {
    router.replace("/generate");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={[styles.brandIcon, { backgroundColor: colors.primary }]}>
              <Feather name="calendar" size={16} color={colors.primaryForeground} />
            </View>
            <Text style={[styles.brandName, { color: colors.foreground }]}>Tempus</Text>
          </View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>
            Let's get started
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            What fills your week?
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Add your classes, activities, and routines. Tempus will build
            the rest around them.
          </Text>
        </View>

        {added.length > 0 && (
          <View style={styles.addedList}>
            {added.map((item, i) => (
              <AddedRow key={item.id} item={item} index={i} colors={colors} />
            ))}
          </View>
        )}

        {showForm ? (
          <View
            style={[
              styles.formCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <CommitmentForm
              onSubmit={handleAdd}
              onCancel={added.length > 0 ? () => setShowForm(false) : undefined}
              submitLabel="Add commitment"
              isLoading={createCommitment.isPending}
            />
          </View>
        ) : (
          <Animated.View
            style={[
              styles.nextActions,
              Platform.OS === "web" ? undefined : { opacity: fadeAnim },
            ]}
          >
            <Pressable
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowForm(true)}
            >
              <Feather name="plus" size={18} color={colors.primaryForeground} />
              <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                Add another
              </Text>
            </Pressable>

            <Pressable
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={handleFinish}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
                I'm done — build my schedule
              </Text>
              <Feather name="arrow-right" size={18} color={colors.foreground} />
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

function AddedRow({
  item,
  index,
  colors,
}: {
  item: Added;
  index: number;
  colors: ReturnType<typeof useColors>;
}) {
  const anim = useState(new Animated.Value(Platform.OS === "web" ? 1 : 0))[0];

  React.useEffect(() => {
    if (Platform.OS === "web") {
      // Skip the JS-driven Animated pass on web: RN Web's non-native-driver
      // style writes have been the root cause of intermittent
      // "Failed to set an indexed property on 'CSSStyleDeclaration'" crashes
      // elsewhere in this app (see bottom-tabs fix in app/(tabs)/_layout.tsx).
      // The mount fade is purely cosmetic, so we just render at full opacity.
      return;
    }
    Animated.spring(anim, {
      toValue: 1,
      delay: index * 60,
      useNativeDriver: true,
      friction: 8,
      tension: 60,
    }).start();
  }, []);

  const content = (
    <>
      <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
        <Feather name="check" size={14} color={colors.primaryForeground} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.addedTitle, { color: colors.foreground }]}>{item.title}</Text>
        <Text style={[styles.addedType, { color: colors.mutedForeground }]}>
          {TYPE_LABEL[item.type] ?? item.type}
        </Text>
      </View>
    </>
  );

  if (Platform.OS === "web") {
    return (
      <View style={[styles.addedRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {content}
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.addedRow,
        { backgroundColor: colors.card, borderColor: colors.border },
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
          ],
        },
      ]}
    >
      {content}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 60,
    gap: 24,
  },
  header: {
    gap: 6,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
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
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
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
    marginTop: 2,
  },
  addedList: {
    gap: 10,
  },
  addedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  addedTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  addedType: {
    fontSize: 13,
    marginTop: 2,
    textTransform: "capitalize",
  },
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  nextActions: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
