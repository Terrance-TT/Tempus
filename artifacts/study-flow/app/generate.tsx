import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Animated,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useDeviceId } from "@/hooks/useDeviceId";
import { useGenerateSchedule, ScheduleScope } from "@workspace/api-client-react";
import { useCreateManualRequest } from "@/hooks/useManualRequests";

type Step = "scope" | "loading" | "questions" | "error" | "expert_form" | "expert_submitted";

export default function GenerateScreen() {
  const colors = useColors();
  const router = useRouter();
  const { deviceId } = useDeviceId();
  const generateSchedule = useGenerateSchedule();
  const createManualRequest = useCreateManualRequest();

  const [step, setStep] = useState<Step>("scope");
  const [scope, setScope] = useState<ScheduleScope>(ScheduleScope.day);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [expertEmail, setExpertEmail] = useState("");
  const [expertDescription, setExpertDescription] = useState("");
  const [expertRequestId, setExpertRequestId] = useState<string | null>(null);

  const runGenerate = (payload: {
    draftId?: string;
    answers?: { question: string; answer: string }[];
  }) => {
    if (!deviceId) return;
    setStep("loading");
    setErrorMessage("");

    generateSchedule.mutate(
      {
        data: {
          deviceId,
          scope,
          ...(payload.draftId ? { draftId: payload.draftId } : {}),
          ...(payload.answers ? { answers: payload.answers } : {}),
        },
      },
      {
        onSuccess: (result) => {
          if (result.status === "complete" && result.schedule) {
            router.replace(`/schedule/${result.schedule.id}`);
            return;
          }
          setDraftId(result.id);
          setQuestions(result.questions ?? []);
          setAnswers({});
          setStep("questions");
        },
        onError: () => {
          setErrorMessage(
            "Something went wrong generating your schedule. Please try again."
          );
          setStep("error");
        },
      }
    );
  };

  const handleStart = () => {
    runGenerate({});
  };

  const handleSubmitAnswers = () => {
    const collected = questions.map((question, i) => ({
      question,
      answer: answers[i]?.trim() || "No preference",
    }));
    runGenerate({ draftId: draftId ?? undefined, answers: collected });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {step === "scope" && (
          <View style={styles.section}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>
              Build a schedule
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              How far ahead should we plan?
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Tempus will fit study time, breaks, and routines around what
              you've already told it.
            </Text>

            <View style={styles.scopeRow}>
              <ScopeOption
                label="A single day"
                description="A focused plan for today or tomorrow"
                selected={scope === ScheduleScope.day}
                colors={colors}
                onPress={() => setScope(ScheduleScope.day)}
              />
              <ScopeOption
                label="A full week"
                description="Mon through Sun, all mapped out"
                selected={scope === ScheduleScope.week}
                colors={colors}
                onPress={() => setScope(ScheduleScope.week)}
              />
            </View>

            <Pressable
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleStart}
            >
              <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                Generate schedule
              </Text>
              <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <Pressable
              style={[styles.expertButton, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setStep("expert_form")}
            >
              <Feather name="user" size={18} color={colors.foreground} />
              <Text style={[styles.expertButtonText, { color: colors.foreground }]}>
                Request expert plan
              </Text>
            </Pressable>
            <Text style={[styles.expertHint, { color: colors.mutedForeground }]}>
              A human coach will craft a personalised schedule for you.
            </Text>
          </View>
        )}

        {step === "expert_form" && (
          <View style={styles.section}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>Expert plan</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Tell us about your week
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              A coach will review your commitments and send back a hand-crafted schedule.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Your email *</Text>
              <TextInput
                style={[
                  styles.questionInput,
                  { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border },
                ]}
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground}
                value={expertEmail}
                onChangeText={setExpertEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                Anything specific you want? (optional)
              </Text>
              <TextInput
                style={[
                  styles.questionInput,
                  styles.multilineInput,
                  { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border },
                ]}
                placeholder="e.g. I have exams next week, prefer mornings..."
                placeholderTextColor={colors.mutedForeground}
                value={expertDescription}
                onChangeText={setExpertDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <Pressable
              style={[
                styles.primaryButton,
                { backgroundColor: expertEmail.trim() ? colors.primary : colors.border },
              ]}
              onPress={() => {
                if (!expertEmail.trim()) return;
                createManualRequest.mutate(
                  {
                    ownerEmail: expertEmail.trim(),
                    timetableDescription: expertDescription.trim() || undefined,
                  },
                  {
                    onSuccess: (result) => {
                      setExpertRequestId(result.data.id);
                      setStep("expert_submitted");
                    },
                    onError: () => {
                      setErrorMessage("Couldn't submit your request. Please try again.");
                      setStep("error");
                    },
                  }
                );
              }}
              disabled={createManualRequest.isPending || !expertEmail.trim()}
            >
              {createManualRequest.isPending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <>
                  <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                    Submit request
                  </Text>
                  <Feather name="send" size={18} color={colors.primaryForeground} />
                </>
              )}
            </Pressable>

            <Pressable onPress={() => setStep("scope")} style={styles.backLink}>
              <Text style={[styles.backLinkText, { color: colors.mutedForeground }]}>
                ← Back
              </Text>
            </Pressable>
          </View>
        )}

        {step === "expert_submitted" && (
          <View style={[styles.section, styles.centred]}>
            <View style={[styles.successCircle, { backgroundColor: `${colors.primary}18` }]}>
              <Feather name="check-circle" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Request sent!</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign: "center" }]}>
              We'll craft your schedule and send it to {expertEmail.trim()}.
              Check the status below.
            </Text>
            {expertRequestId ? (
              <Pressable
                style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 8 }]}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onPress={() => router.replace(`/request/${expertRequestId}` as any)}
              >
                <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                  Check status
                </Text>
                <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
              </Pressable>
            ) : null}
            <Pressable onPress={() => router.back()} style={styles.backLink}>
              <Text style={[styles.backLinkText, { color: colors.mutedForeground }]}>
                Done
              </Text>
            </Pressable>
          </View>
        )}

        {step === "loading" && (
          <View style={styles.loadingSection}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.loadingText, { color: colors.foreground }]}>
              Thinking through your week...
            </Text>
            <Text style={[styles.loadingSubtext, { color: colors.mutedForeground }]}>
              Balancing classes, activities, and downtime.
            </Text>
          </View>
        )}

        {step === "questions" && (
          <View style={styles.section}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>
              Just a couple things
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Help me get this right
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Quick answers so your schedule actually fits your life.
            </Text>

            <View style={styles.questionsList}>
              {questions.map((q, i) => (
                <QuestionField
                  key={i}
                  index={i}
                  question={q}
                  value={answers[i] ?? ""}
                  onChange={(text) =>
                    setAnswers((prev) => ({ ...prev, [i]: text }))
                  }
                  colors={colors}
                />
              ))}
            </View>

            <Pressable
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleSubmitAnswers}
            >
              <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                Continue
              </Text>
              <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
            </Pressable>
          </View>
        )}

        {step === "error" && (
          <View style={styles.section}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              That didn't work
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {errorMessage}
            </Text>
            <Pressable
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => setStep("scope")}
            >
              <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                Try again
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ScopeOption({
  label,
  description,
  selected,
  colors,
  onPress,
}: {
  label: string;
  description: string;
  selected: boolean;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.scopeOption,
        { borderColor: selected ? colors.primary : colors.border },
        selected && { backgroundColor: colors.secondary },
      ]}
    >
      <View
        style={[
          styles.radio,
          { borderColor: selected ? colors.primary : colors.border },
        ]}
      >
        {selected && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.scopeLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.scopeDescription, { color: colors.mutedForeground }]}>
          {description}
        </Text>
      </View>
    </Pressable>
  );
}

function QuestionField({
  index,
  question,
  value,
  onChange,
  colors,
}: {
  index: number;
  question: string;
  value: string;
  onChange: (text: string) => void;
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
      delay: index * 70,
      useNativeDriver: true,
      friction: 8,
      tension: 60,
    }).start();
  }, []);

  const content = (
    <>
      <Text style={[styles.questionLabel, { color: colors.foreground }]}>{question}</Text>
      <TextInput
        style={[
          styles.questionInput,
          { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border },
        ]}
        placeholder="Your answer"
        placeholderTextColor={colors.mutedForeground}
        value={value}
        onChangeText={onChange}
      />
    </>
  );

  if (Platform.OS === "web") {
    return <View style={{ gap: 8 }}>{content}</View>;
  }

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [10, 0],
            }),
          },
        ],
        gap: 8,
      }}
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
    paddingTop: 40,
    paddingBottom: 60,
  },
  section: {
    gap: 16,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 23,
  },
  scopeRow: {
    gap: 12,
    marginTop: 8,
  },
  scopeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  scopeLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  scopeDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  primaryButton: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  loadingSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 120,
    gap: 14,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "600",
  },
  loadingSubtext: {
    fontSize: 14,
  },
  questionsList: {
    gap: 20,
    marginTop: 4,
  },
  questionLabel: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
  },
  questionInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: "500",
  },
  expertButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  expertButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  expertHint: {
    fontSize: 13,
    textAlign: "center",
    marginTop: -4,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  multilineInput: {
    height: 100,
    paddingTop: 12,
  },
  backLink: {
    alignItems: "center",
    paddingVertical: 8,
  },
  backLinkText: {
    fontSize: 14,
  },
  centred: {
    alignItems: "center",
    gap: 14,
    paddingTop: 20,
  },
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
});
