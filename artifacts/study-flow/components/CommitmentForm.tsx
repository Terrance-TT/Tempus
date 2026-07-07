import React, { useState } from "react";
import { StyleSheet, Text, View, TextInput, Pressable, ScrollView, Platform } from "react-native";
import { useColors } from "@/hooks/useColors";
import { DayOfWeek, CommitmentType } from "@workspace/api-client-react";

interface CommitmentFormProps {
  initialData?: {
    title: string;
    type: CommitmentType;
    daysOfWeek: DayOfWeek[];
    startTime: string;
    endTime: string;
    notes?: string | null;
  };
  onSubmit: (data: {
    title: string;
    type: CommitmentType;
    daysOfWeek: DayOfWeek[];
    startTime: string;
    endTime: string;
    notes?: string | null;
  }) => void;
  onCancel?: () => void;
  submitLabel?: string;
  isLoading?: boolean;
}

const DAYS = [
  { id: DayOfWeek.mon, label: "M" },
  { id: DayOfWeek.tue, label: "T" },
  { id: DayOfWeek.wed, label: "W" },
  { id: DayOfWeek.thu, label: "T" },
  { id: DayOfWeek.fri, label: "F" },
  { id: DayOfWeek.sat, label: "S" },
  { id: DayOfWeek.sun, label: "S" },
];

const TYPES = [
  { id: CommitmentType.class, label: "Class" },
  { id: CommitmentType.extracurricular, label: "Activity" },
  { id: CommitmentType.routine, label: "Routine" },
];

export function CommitmentForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  isLoading = false,
}: CommitmentFormProps) {
  const colors = useColors();

  const [title, setTitle] = useState(initialData?.title || "");
  const [type, setType] = useState<CommitmentType>(initialData?.type || CommitmentType.class);
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>(initialData?.daysOfWeek || []);
  const [startTime, setStartTime] = useState(initialData?.startTime || "");
  const [endTime, setEndTime] = useState(initialData?.endTime || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  
  const [error, setError] = useState("");

  const toggleDay = (day: DayOfWeek) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = () => {
    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }
    if (daysOfWeek.length === 0) {
      setError("Please select at least one day");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      setError("Please enter valid times (HH:MM)");
      return;
    }
    
    setError("");
    onSubmit({
      title: title.trim(),
      type,
      daysOfWeek,
      startTime,
      endTime,
      notes: notes.trim() || null,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
      
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>What is it?</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
          placeholder="e.g. Calculus 101, Soccer Practice, Dinner"
          placeholderTextColor={colors.mutedForeground}
          value={title}
          onChangeText={setTitle}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>Type</Text>
        <View style={styles.row}>
          {TYPES.map((t) => {
            const isSelected = type === t.id;
            return (
              <Pressable
                key={t.id}
                style={[
                  styles.pill,
                  { borderColor: colors.border },
                  isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
                onPress={() => setType(t.id)}
              >
                <Text style={[
                  styles.pillText,
                  { color: colors.foreground },
                  isSelected && { color: colors.primaryForeground }
                ]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>Days</Text>
        <View style={styles.row}>
          {DAYS.map((d) => {
            const isSelected = daysOfWeek.includes(d.id);
            return (
              <Pressable
                key={d.id}
                style={[
                  styles.dayCircle,
                  { borderColor: colors.border },
                  isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
                onPress={() => toggleDay(d.id)}
              >
                <Text style={[
                  styles.dayText,
                  { color: colors.foreground },
                  isSelected && { color: colors.primaryForeground, fontWeight: "600" }
                ]}>
                  {d.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.fieldRow}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.label, { color: colors.foreground }]}>Start Time</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            placeholder="09:00"
            placeholderTextColor={colors.mutedForeground}
            value={startTime}
            onChangeText={setStartTime}
          />
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.label, { color: colors.foreground }]}>End Time</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            placeholder="10:30"
            placeholderTextColor={colors.mutedForeground}
            value={endTime}
            onChangeText={setEndTime}
          />
        </View>
      </View>
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>Use 24-hour format (e.g. 14:00 for 2:00 PM)</Text>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>Notes (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
          placeholder="Location, details..."
          placeholderTextColor={colors.mutedForeground}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.actions}>
        {onCancel && (
          <Pressable 
            style={[styles.button, styles.cancelButton, { borderColor: colors.border }]} 
            onPress={onCancel}
            disabled={isLoading}
          >
            <Text style={{ color: colors.foreground, fontWeight: "500" }}>Cancel</Text>
          </Pressable>
        )}
        <Pressable 
          style={[styles.button, { backgroundColor: colors.primary, flex: 1, opacity: isLoading ? 0.7 : 1 }]} 
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={{ color: colors.primaryForeground, fontWeight: "600" }}>
            {isLoading ? "Saving..." : submitLabel}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 24,
  },
  field: {
    gap: 8,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
  },
  hint: {
    fontSize: 13,
    marginTop: -16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}),
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 14,
    fontWeight: "500",
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 15,
  },
  error: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: -8,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
});
