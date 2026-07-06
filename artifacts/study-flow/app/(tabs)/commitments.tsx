import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Modal,
  Animated,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useDeviceId } from "@/hooks/useDeviceId";
import {
  useListCommitments,
  useCreateCommitment,
  useUpdateCommitment,
  useDeleteCommitment,
  getListCommitmentsQueryKey,
  Commitment,
} from "@workspace/api-client-react";
import { CommitmentForm } from "@/components/CommitmentForm";

const TYPE_LABEL: Record<string, string> = {
  class: "Class",
  extracurricular: "Activity",
  routine: "Routine",
};

export default function CommitmentsScreen() {
  const colors = useColors();
  const { deviceId } = useDeviceId();
  const queryClient = useQueryClient();

  const { data: commitments, isLoading } = useListCommitments(
    { deviceId: deviceId || "" },
    { query: { enabled: !!deviceId } as any }
  );

  const invalidate = () => {
    if (deviceId) {
      queryClient.invalidateQueries({
        queryKey: getListCommitmentsQueryKey({ deviceId }),
      });
    }
  };

  const createCommitment = useCreateCommitment({
    mutation: { onSuccess: invalidate },
  });
  const updateCommitment = useUpdateCommitment({
    mutation: { onSuccess: invalidate },
  });
  const deleteCommitment = useDeleteCommitment({
    mutation: { onSuccess: invalidate },
  });

  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Commitment | null>(null);

  const closeModal = () => {
    setModalMode(null);
    setEditing(null);
  };

  const handleSubmit = (data: {
    title: string;
    type: any;
    daysOfWeek: any;
    startTime: string;
    endTime: string;
    notes?: string | null;
  }) => {
    if (modalMode === "edit" && editing && deviceId) {
      updateCommitment.mutate(
        { id: editing.id, data: { deviceId, ...data } },
        { onSuccess: closeModal }
      );
    } else if (deviceId) {
      createCommitment.mutate(
        { data: { deviceId, ...data } },
        { onSuccess: closeModal }
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Commitments</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Everything StudyFlow builds around
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {commitments?.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                Nothing here yet
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Add a class, activity, or routine to get started.
              </Text>
            </View>
          )}
          {commitments?.map((c, i) => (
            <CommitmentRow
              key={c.id}
              commitment={c}
              index={i}
              colors={colors}
              onEdit={() => {
                setEditing(c);
                setModalMode("edit");
              }}
              onDelete={() =>
                deviceId &&
                deleteCommitment.mutate({ id: c.id, params: { deviceId } })
              }
            />
          ))}
          <Pressable
            style={[styles.addButton, { backgroundColor: colors.secondary }]}
            onPress={() => setModalMode("add")}
          >
            <Feather name="plus" size={18} color={colors.secondaryForeground} />
            <Text style={{ color: colors.secondaryForeground, fontWeight: "600" }}>
              Add commitment
            </Text>
          </Pressable>
        </ScrollView>
      )}

      <Modal
        visible={modalMode !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {modalMode === "edit" ? "Edit commitment" : "New commitment"}
            </Text>
            <Pressable onPress={closeModal} hitSlop={10}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <CommitmentForm
            initialData={
              editing
                ? {
                    title: editing.title,
                    type: editing.type,
                    daysOfWeek: editing.daysOfWeek,
                    startTime: editing.startTime,
                    endTime: editing.endTime,
                    notes: editing.notes,
                  }
                : undefined
            }
            onSubmit={handleSubmit}
            onCancel={closeModal}
            submitLabel={modalMode === "edit" ? "Save changes" : "Add commitment"}
            isLoading={createCommitment.isPending || updateCommitment.isPending}
          />
        </View>
      </Modal>
    </View>
  );
}

function CommitmentRow({
  commitment,
  index,
  colors,
  onEdit,
  onDelete,
}: {
  commitment: Commitment;
  index: number;
  colors: ReturnType<typeof useColors>;
  onEdit: () => void;
  onDelete: () => void;
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
      delay: index * 50,
      useNativeDriver: true,
      friction: 8,
      tension: 60,
    }).start();
  }, []);

  const card = (
    <Pressable
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onEdit}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, { color: colors.cardForeground }]}>
          {commitment.title}
        </Text>
        <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
          {TYPE_LABEL[commitment.type] ?? commitment.type} • {commitment.daysOfWeek.join(", ")} • {commitment.startTime}–{commitment.endTime}
        </Text>
      </View>
      <Pressable onPress={onDelete} hitSlop={10} style={styles.deleteButton}>
        <Feather name="trash-2" size={18} color={colors.destructive} />
      </Pressable>
    </Pressable>
  );

  if (Platform.OS === "web") {
    return card;
  }

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
        ],
      }}
    >
      {card}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
  },
  content: {
    paddingHorizontal: 24,
    gap: 12,
    paddingBottom: 120,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    textTransform: "capitalize",
  },
  deleteButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
});
