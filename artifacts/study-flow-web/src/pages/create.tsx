import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useDeviceId,
  useIsSignedIn,
  setPendingScheduleId,
  savePendingCreateState,
  getPendingCreateState,
  clearPendingCreateState,
  saveCreateDraft,
  getCreateDraft,
  clearCreateDraft,
} from "@/hooks/use-device-id";
import { useSubscriptionStatus } from "@/hooks/use-subscription";
import {
  useExtractCommitmentsFromImage,
  useExtractCommitmentsFromText,
  useListCommitments,
  useDeleteCommitment,
  useGenerateSchedule,
  getListCommitmentsQueryKey,
  useListAssignments,
  getListAssignmentsQueryKey,
  useGetPreferences,
  getGetPreferencesQueryKey,
  useUpdatePreferences,
  Task,
  ScheduleScope,
  ClarificationAnswer,
  UserPreferences,
  ScheduleBlock,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Upload,
  Trash2,
  Plus,
  Clock,
  CalendarDays,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ListTodo,
  Sparkles,
  MessageSquareText,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lock,
  Moon,
  Sun,
  UtensilsCrossed,
  Link2,
  Zap,
  BookOpen,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function Create() {
  const deviceId = useDeviceId();
  const isSignedIn = useIsSignedIn();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isColumbiaMode] = useState(() => {
    if (sessionStorage.getItem("columbiaPreset")) return true;
    return !!getPendingCreateState()?.columbiaPreset;
  });

  const [resumedFromDraft, setResumedFromDraft] = useState(false);
  const draftInitializedRef = useRef(false);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [inputMode, setInputMode] = useState<"photo" | "describe">("photo");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [describeText, setDescribeText] = useState("");
  const [showCommitmentDetails, setShowCommitmentDetails] = useState(false);
  const [lastExtractedCount, setLastExtractedCount] = useState<number | null>(null);

  // Step 2 State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskMinutes, setNewTaskMinutes] = useState("");

  // Step 3 State
  const [scope, setScope] = useState<ScheduleScope>("week");
  const [isGenerating, setIsGenerating] = useState(false);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<string[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [lockedScheduleId, setLockedScheduleId] = useState<string | null>(null);

  // Ad + subscription state
  const { data: subStatus } = useSubscriptionStatus();
  const [adCountdown, setAdCountdown] = useState<number | null>(null);
  const [pendingNavScheduleId, setPendingNavScheduleId] = useState<string | null>(null);
  const [pendingRevealBlocks, setPendingRevealBlocks] = useState<ScheduleBlock[] | null>(null);

  // Reveal screen: shown after generation for signed-in users
  const [revealData, setRevealData] = useState<{ scheduleId: string; blocks: ScheduleBlock[] } | null>(null);

  // Step 3 study-style preferences
  const [studyPref, setStudyPref] = useState<string[]>([]);
  const [focusLength, setFocusLength] = useState<string | null>(null);
  const [showRoutineDetails, setShowRoutineDetails] = useState(false);

  // Preferences (persisted per user)
  const [wakeTime, setWakeTime] = useState("");
  const [bedTime, setBedTime] = useState("");
  const [mealTimes, setMealTimes] = useState("");
  const [prefNotes, setPrefNotes] = useState("");
  const prefsHydratedRef = useRef(false);

  const { data: commitments = [], isLoading: isLoadingCommitments } = useListCommitments(
    { deviceId: deviceId || "" },
    { query: { enabled: !!deviceId, queryKey: getListCommitmentsQueryKey({ deviceId: deviceId || "" }) } }
  );

  const { data: importedAssignments = [] } = useListAssignments(
    { deviceId: deviceId || "" },
    { query: { enabled: !!deviceId, queryKey: getListAssignmentsQueryKey({ deviceId: deviceId || "" }) } }
  );

  const { data: savedPrefs } = useGetPreferences(
    { deviceId: deviceId || "" },
    { query: { enabled: !!deviceId, queryKey: getGetPreferencesQueryKey({ deviceId: deviceId || "" }) } }
  );

  useEffect(() => {
    if (savedPrefs && !prefsHydratedRef.current) {
      prefsHydratedRef.current = true;
      setWakeTime(savedPrefs.wakeTime ?? "");
      setBedTime(savedPrefs.bedTime ?? "");
      setMealTimes(savedPrefs.mealTimes ?? "");
      setPrefNotes(savedPrefs.notes ?? "");
    }
  }, [savedPrefs]);

  // Restore progress on mount — pendingCreateState (sign-in redirect) takes
  // priority; otherwise restore a saved draft.
  useEffect(() => {
    if (draftInitializedRef.current) return;
    draftInitializedRef.current = true;

    const pending = getPendingCreateState();
    if (pending) {
      if (pending.columbiaPreset) sessionStorage.setItem("columbiaPreset", "1");
      if (pending.step) setStep(pending.step);
      clearPendingCreateState();
      return;
    }

    const draft = getCreateDraft();
    if (!draft) return;
    // Only restore if there's meaningful progress
    if (draft.step === 1 && draft.tasks.length === 0) return;

    setStep(draft.step);
    setTasks(draft.tasks);
    setStudyPref(draft.studyPref);
    setFocusLength(draft.focusLength);
    setWakeTime(draft.wakeTime);
    setBedTime(draft.bedTime);
    setMealTimes(draft.mealTimes);
    setPrefNotes(draft.prefNotes);
    prefsHydratedRef.current = true; // prevent server prefs from overriding restored values
    setResumedFromDraft(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save draft whenever key wizard state changes
  useEffect(() => {
    if (!draftInitializedRef.current) return;
    const hasMeaningfulProgress = step > 1 || tasks.length > 0 || studyPref.length > 0 || focusLength !== null;
    if (hasMeaningfulProgress) {
      saveCreateDraft({
        step,
        tasks: tasks.map(t => ({ ...t, estimatedMinutes: t.estimatedMinutes ?? null })),
        studyPref,
        focusLength,
        wakeTime,
        bedTime,
        mealTimes,
        prefNotes,
        columbiaPreset: isColumbiaMode,
        savedAt: Date.now(),
      });
    } else {
      clearCreateDraft();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, tasks, studyPref, focusLength, wakeTime, bedTime, mealTimes, prefNotes]);

  // Save progress and go to sign-in — survives OAuth full-page redirect
  const goToSignIn = () => {
    savePendingCreateState({ columbiaPreset: isColumbiaMode, step });
    setLocation("/sign-in");
  };
  const goToSignUp = () => {
    savePendingCreateState({ columbiaPreset: isColumbiaMode, step });
    setLocation("/sign-up");
  };

  const handleStartOver = () => {
    clearCreateDraft();
    setStep(1);
    setTasks([]);
    setStudyPref([]);
    setFocusLength(null);
    setDescribeText("");
    setLastExtractedCount(null);
    setResumedFromDraft(false);
    prefsHydratedRef.current = false; // allow server prefs to re-hydrate
  };

  const extractCommitments = useExtractCommitmentsFromImage();
  const extractFromText = useExtractCommitmentsFromText();
  const deleteCommitment = useDeleteCommitment();
  const generateSchedule = useGenerateSchedule();
  const updatePreferences = useUpdatePreferences();

  // Columbia preset: auto-extract the known class schedule when ?columbia=1
  const columbiaHandledRef = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("columbia") || columbiaHandledRef.current || !deviceId) return;
    columbiaHandledRef.current = true;
    window.history.replaceState(null, "", window.location.pathname);
    setInputMode("describe");
    setIsExtracting(true);
    setExtractionError(false);
    const columbiaSchedule =
      "I have a class called Entrepreneurship with Daniel every weekday (Monday–Friday) from 9:10 AM to 11:00 AM, and again from 1:10 PM to 3:00 PM. Lunch is every day from 11:00 AM to 1:00 PM.";
    // Clear any existing commitments first, then extract
    Promise.all(commitments.map(
      (c) => new Promise<void>((resolve) => {
        deleteCommitment.mutate({ id: c.id, params: { deviceId } }, { onSettled: () => resolve() });
      })
    )).then(() => {
      extractFromText.mutate(
        { data: { deviceId, description: columbiaSchedule } },
        {
          onSuccess: (newCommitments) => {
            onExtractionSuccess(newCommitments.length);
            if (newCommitments.length > 0) setStep(2);
          },
          onError: () => {
            setIsExtracting(false);
            setExtractionError(true);
          },
        },
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  // Arriving from Integrations with imported assignments: jump straight to
  // tasks and pre-fill them.
  const importHandledRef = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("fromImport") || importHandledRef.current) return;
    if (importedAssignments.length === 0) return;
    importHandledRef.current = true;
    window.history.replaceState(null, "", window.location.pathname);
    setTasks((prev) => {
      const existing = new Set(prev.map((t) => t.title));
      const added = importedAssignments
        .filter((a) => !existing.has(a.courseName ? `${a.courseName}: ${a.title}` : a.title))
        .map((a) => {
          const due = new Date(a.dueDate);
          return {
            title: a.courseName ? `${a.courseName}: ${a.title}` : a.title,
            dueDate: Number.isNaN(due.getTime()) ? a.dueDate : due.toISOString().slice(0, 10),
            estimatedMinutes: null,
          };
        });
      return [...prev, ...added];
    });
    setStep(2);
  }, [importedAssignments]);

  const onExtractionSuccess = (count: number) => {
    if (!deviceId) return;
    queryClient.invalidateQueries({ queryKey: getListCommitmentsQueryKey({ deviceId }) });
    setIsExtracting(false);
    if (count === 0) {
      setExtractionError(true);
    } else {
      setLastExtractedCount(count);
      toast({ title: "Got it!", description: `Found ${count} commitment(s) in your schedule.` });
    }
  };

  const processFile = (file: File) => {
    if (!deviceId) return;
    setIsExtracting(true);
    setExtractionError(false);
    const reader = new FileReader();
    reader.onload = async (event) => {
      // Clear any previously saved commitments so the new upload starts fresh.
      for (const c of commitments) {
        await new Promise<void>((resolve) => {
          deleteCommitment.mutate({ id: c.id, params: { deviceId } }, { onSettled: () => resolve() });
        });
      }
      const base64 = event.target?.result as string;
      extractCommitments.mutate(
        { data: { deviceId, imageBase64: base64 } },
        {
          onSuccess: (newCommitments) => onExtractionSuccess(newCommitments.length),
          onError: () => {
            setIsExtracting(false);
            setExtractionError(true);
            toast({ title: "Extraction failed", description: "Could not read the image.", variant: "destructive" });
          },
        }
      );
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) processFile(file);
    else toast({ title: "Please drop an image file", variant: "destructive" });
  };

  const handleDescribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId || !describeText.trim()) return;
    setIsExtracting(true);
    setExtractionError(false);
    // Clear any previously saved commitments so the new description starts fresh.
    for (const c of commitments) {
      await new Promise<void>((resolve) => {
        deleteCommitment.mutate({ id: c.id, params: { deviceId } }, { onSettled: () => resolve() });
      });
    }
    extractFromText.mutate(
      { data: { deviceId, description: describeText.trim() } },
      {
        onSuccess: (newCommitments) => {
          onExtractionSuccess(newCommitments.length);
          if (newCommitments.length > 0) {
            setDescribeText("");
            setStep(2);
          }
        },
        onError: () => {
          setIsExtracting(false);
          setExtractionError(true);
          toast({ title: "Couldn't understand that", description: "Try describing your week with days and times.", variant: "destructive" });
        }
      }
    );
  };

  const handleDeleteCommitment = (id: string) => {
    if (!deviceId) return;
    deleteCommitment.mutate(
      { id, params: { deviceId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCommitmentsQueryKey({ deviceId }) });
        }
      }
    );
  };

  const handleClearAllCommitments = async () => {
    if (!deviceId) return;
    for (const c of commitments) {
      await new Promise<void>((resolve) => {
        deleteCommitment.mutate({ id: c.id, params: { deviceId } }, { onSettled: () => resolve() });
      });
    }
    queryClient.invalidateQueries({ queryKey: getListCommitmentsQueryKey({ deviceId }) });
    setLastExtractedCount(null);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskDueDate.trim()) return;

    setTasks([...tasks, {
      title: newTaskTitle.trim(),
      dueDate: newTaskDueDate.trim(),
      estimatedMinutes: newTaskMinutes ? parseInt(newTaskMinutes, 10) : null
    }]);

    setNewTaskTitle("");
    setNewTaskDueDate("");
    setNewTaskMinutes("");
  };

  const handleRemoveTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleAddImportedAssignments = () => {
    const existingTitles = new Set(tasks.map(t => t.title));
    const newTasks: Task[] = importedAssignments
      .filter(a => !existingTitles.has(a.courseName ? `${a.courseName}: ${a.title}` : a.title))
      .map(a => {
        const due = new Date(a.dueDate);
        return {
          title: a.courseName ? `${a.courseName}: ${a.title}` : a.title,
          dueDate: Number.isNaN(due.getTime()) ? a.dueDate : due.toISOString().slice(0, 10),
          estimatedMinutes: null
        };
      });
    if (newTasks.length === 0) {
      toast({ title: "Nothing new to add", description: "All imported assignments are already in your list." });
      return;
    }
    setTasks([...tasks, ...newTasks]);
    toast({ title: "Assignments added", description: `${newTasks.length} imported assignment(s) added to your tasks.` });
  };

  const buildPreferences = (): UserPreferences => {
    const hints: string[] = [];
    if (studyPref.length > 0) hints.push(`Preferred study time: ${studyPref.join(", ")}`);
    if (focusLength) hints.push(`Focus session length: ${focusLength} minutes`);
    const combinedNotes = [prefNotes.trim(), ...hints].filter(Boolean).join(". ");
    return {
      wakeTime: wakeTime.trim() || null,
      bedTime: bedTime.trim() || null,
      mealTimes: mealTimes.trim() || null,
      notes: combinedNotes || null,
    };
  };

  // Ad countdown tick
  useEffect(() => {
    if (adCountdown === null || adCountdown <= 0) return;
    const t = setTimeout(() => setAdCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [adCountdown]);

  // When ad finishes, navigate if result is already waiting
  useEffect(() => {
    if (adCountdown === 0 && pendingNavScheduleId) {
      const id = pendingNavScheduleId;
      const blocks = pendingRevealBlocks;
      setPendingNavScheduleId(null);
      setPendingRevealBlocks(null);
      setAdCountdown(null);
      onGenerateComplete(id, blocks ?? undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adCountdown, pendingNavScheduleId]);

  const onGenerateComplete = (scheduleId: string, blocks?: ScheduleBlock[]) => {
    clearCreateDraft();
    if (isSignedIn) {
      const interestingBlocks = (blocks ?? []).filter(b =>
        ["homework", "study", "review", "assignment"].includes(b.category)
      );
      if (interestingBlocks.length > 0) {
        setRevealData({ scheduleId, blocks: interestingBlocks });
      } else {
        toast({ title: "Schedule generated!" });
        setLocation(`/schedule/${scheduleId}`);
      }
    } else {
      // Guests must sign in to view the result.
      setPendingScheduleId(scheduleId);
      setLockedScheduleId(scheduleId);
      setIsGenerating(false);
    }
  };

  const startAdIfNeeded = () => {
    if (!subStatus?.isPro) {
      setAdCountdown(5);
    }
  };

  const handleGenerate = (selectedScope: ScheduleScope) => {
    if (!deviceId) return;
    setScope(selectedScope);
    setIsGenerating(true);
    setClarifyingQuestions([]);
    setPendingNavScheduleId(null);
    startAdIfNeeded();

    const preferences = buildPreferences();

    // Persist preferences so they're remembered next time (fire-and-forget).
    updatePreferences.mutate({ data: { deviceId, ...preferences } });

    generateSchedule.mutate(
      { data: { deviceId, scope: selectedScope, tasks, preferences } },
      {
        onSuccess: (result) => {
          if (result.status === "needs_clarification" && result.questions) {
            setDraftId(result.id);
            setClarifyingQuestions(result.questions);
            setIsGenerating(false);
            setAdCountdown(null);
          } else if (result.status === "complete" && result.schedule) {
            setIsGenerating(false);
            // If the ad is still running, hold the result until it finishes
            if (adCountdown !== null && adCountdown > 0) {
              setPendingNavScheduleId(result.schedule.id);
              setPendingRevealBlocks(result.schedule.blocks ?? null);
            } else {
              setAdCountdown(null);
              onGenerateComplete(result.schedule.id, result.schedule.blocks ?? undefined);
            }
          }
        },
        onError: (err: any) => {
          const isLimit = (err?.data as any)?.code === "LIMIT_REACHED";
          setAdCountdown(null);
          setIsGenerating(false);
          if (isLimit) {
            toast({ title: "Upgrade to Pro", description: "You've used your 2 free schedules. Upgrade to generate more.", variant: "destructive" });
          } else {
            toast({ title: "Error generating schedule", description: err?.data?.message, variant: "destructive" });
          }
        }
      }
    );
  };

  const handleClarifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId || !draftId) return;

    const formattedAnswers: ClarificationAnswer[] = clarifyingQuestions.map(q => ({
      question: q,
      answer: answers[q] || "No preference",
    }));

    setIsGenerating(true);
    setPendingNavScheduleId(null);
    startAdIfNeeded();

    generateSchedule.mutate(
      { data: { deviceId, scope, draftId, answers: formattedAnswers, tasks, preferences: buildPreferences() } },
      {
        onSuccess: (result) => {
          if (result.status === "needs_clarification" && result.questions) {
            setDraftId(result.id);
            setClarifyingQuestions(result.questions);
            setIsGenerating(false);
            setAdCountdown(null);
          } else if (result.status === "complete" && result.schedule) {
            setIsGenerating(false);
            if (adCountdown !== null && adCountdown > 0) {
              setPendingNavScheduleId(result.schedule.id);
              setPendingRevealBlocks(result.schedule.blocks ?? null);
            } else {
              setAdCountdown(null);
              onGenerateComplete(result.schedule.id, result.schedule.blocks ?? undefined);
            }
          }
        },
        onError: (err: any) => {
          setAdCountdown(null);
          toast({ title: "Error", description: err?.data?.message, variant: "destructive" });
          setIsGenerating(false);
        }
      }
    );
  };

  if (!deviceId || isLoadingCommitments) {
    return (
      <Layout>
        <div className="space-y-6 pt-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Columbia sign-in nudge — fixed right panel, desktop only */}
      {isColumbiaMode && !isSignedIn && (
        <div className="hidden lg:flex fixed right-5 top-1/2 -translate-y-1/2 z-40 flex-col gap-3 w-52 rounded-2xl border bg-card shadow-lg shadow-black/5 p-4 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <p className="font-semibold text-sm leading-tight">Save your schedule</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Sign in with your Columbia email so your plan isn't lost when you close the tab.
          </p>
          <Button
            size="sm"
            className="w-full rounded-xl"
            onClick={goToSignIn}
          >
            Sign in <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
          <p className="text-[10px] text-muted-foreground/70 text-center leading-tight">
            Use your <span className="font-medium">@columbia.edu</span> Google account
          </p>
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-8 pt-4 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 ${s === step ? 'w-8 bg-primary' : s < step ? 'w-4 bg-primary/40' : 'w-4 bg-secondary'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            {resumedFromDraft && (
              <button
                type="button"
                onClick={handleStartOver}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Start over
              </button>
            )}
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Step {step} of 3
            </span>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <header className="space-y-2">
              <h1 className="text-3xl font-heading font-semibold text-foreground">Tell us your week</h1>
              <p className="text-muted-foreground text-lg">Snap a photo of your timetable — or just describe your week in words. Our AI will suggest which assignment to tackle when, so you stay on track.</p>
            </header>

            <div className="flex items-stretch p-1.5 bg-secondary/40 rounded-xl border-2 border-border/70" data-testid="tabs-input-mode">
              <button
                type="button"
                onClick={() => setInputMode("photo")}
                data-testid="tab-photo"
                className={`flex flex-1 items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all border-2 ${inputMode === "photo" ? "bg-background shadow-sm text-foreground border-border/70" : "text-muted-foreground hover:text-foreground border-transparent hover:border-border/40"}`}
              >
                <Camera className="w-4 h-4" /> Snap a photo
              </button>
              <div className="w-px bg-border/70 my-1" />
              <button
                type="button"
                onClick={() => setInputMode("describe")}
                data-testid="tab-describe"
                className={`flex flex-1 items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all border-2 ${inputMode === "describe" ? "bg-background shadow-sm text-foreground border-border/70" : "text-muted-foreground hover:text-foreground border-transparent hover:border-border/40"}`}
              >
                <MessageSquareText className="w-4 h-4" /> Describe it
              </button>
            </div>

            {inputMode === "photo" && (
              <Card
                className={`border-dashed transition-colors cursor-default ${isDragging ? "border-primary bg-primary/10 scale-[1.01]" : "bg-secondary/20 hover:bg-secondary/30"}`}
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                data-testid="card-photo-dropzone"
              >
                <CardContent className="p-8 text-center space-y-6">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />

                  {isExtracting ? (
                    <div className="py-8 space-y-4">
                      <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                      <p className="text-primary font-medium animate-pulse">Reading your schedule...</p>
                    </div>
                  ) : isDragging ? (
                    <div className="py-8 space-y-3 pointer-events-none">
                      <div className="w-20 h-20 bg-primary/15 rounded-full flex items-center justify-center mx-auto text-primary">
                        <Upload className="w-10 h-10" />
                      </div>
                      <p className="text-primary font-semibold text-lg">Drop it here!</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                        <Camera className="w-10 h-10" />
                      </div>

                      <div className="space-y-2">
                        <p className="text-muted-foreground text-sm">Drag your timetable photo here, or</p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <Button size="lg" onClick={() => fileInputRef.current?.click()} className="rounded-xl shadow-sm" data-testid="button-take-photo">
                            <Camera className="mr-2 w-5 h-5" /> Take Photo
                          </Button>
                          <Button size="lg" variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-xl bg-background" data-testid="button-upload-image">
                            <Upload className="mr-2 w-5 h-5" /> Browse File
                          </Button>
                        </div>

                        {extractionError && (
                          <p className="text-destructive text-sm mt-4">We couldn't read that clearly. Try taking another photo — or switch to "Describe it".</p>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {inputMode === "describe" && (
              <Card className="border shadow-sm">
                <CardContent className="p-6">
                  {isExtracting ? (
                    <div className="py-8 space-y-4 text-center">
                      <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                      <p className="text-primary font-medium animate-pulse">Turning your words into a schedule...</p>
                    </div>
                  ) : (
                    <form onSubmit={handleDescribeSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-base">Describe your regular week</Label>
                        <p className="text-sm text-muted-foreground">
                          Include days and times — e.g. <span className="italic">"School 8am–3pm Monday to Friday, soccer practice Tuesdays and Thursdays 4–5:30, piano lesson Wednesday at 6"</span>
                        </p>
                      </div>
                      <Textarea
                        placeholder="Start typing your week..."
                        value={describeText}
                        onChange={(e) => setDescribeText(e.target.value)}
                        className="min-h-[140px] text-base"
                        data-testid="input-describe-week"
                      />
                      {extractionError && (
                        <p className="text-destructive text-sm">We couldn't find any commitments in that. Include days and times, like "soccer Tuesdays 4-5:30pm".</p>
                      )}
                      <Button type="submit" size="lg" className="w-full rounded-xl" disabled={!describeText.trim()} data-testid="button-extract-text">
                        <Sparkles className="mr-2 w-5 h-5" /> Add to my schedule
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            )}

            {commitments.length > 0 && (
              <Card className="border-primary/30 bg-primary/5 shadow-sm" data-testid="card-commitments-summary">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold">
                          {commitments.length} commitment{commitments.length === 1 ? "" : "s"} in your week
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {lastExtractedCount !== null ? "Schedule captured — you're ready to continue." : "From your saved schedule."}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearAllCommitments}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        data-testid="button-clear-commitments"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Start fresh
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCommitmentDetails(v => !v)}
                        className="text-muted-foreground"
                        data-testid="button-toggle-commitments"
                      >
                        {showCommitmentDetails ? (
                          <>Hide details <ChevronUp className="ml-1 w-4 h-4" /></>
                        ) : (
                          <>Review & edit <ChevronDown className="ml-1 w-4 h-4" /></>
                        )}
                      </Button>
                    </div>
                  </div>

                  {showCommitmentDetails && (
                    <div className="grid gap-2 pt-2 border-t border-primary/10 animate-in fade-in duration-200">
                      {commitments.map((c) => (
                        <div key={c.id} className="bg-background border rounded-xl px-4 py-3 flex justify-between items-center group">
                          <div>
                            <p className="font-medium text-sm">{c.title}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                              <CalendarDays className="w-3 h-3" />
                              <span className="uppercase tracking-wider">{c.daysOfWeek.join(", ")}</span>
                              <span className="opacity-50">•</span>
                              <Clock className="w-3 h-3" />
                              <span>{c.startTime} - {c.endTime}</span>
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8" onClick={() => handleDeleteCommitment(c.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end pt-6">
              <Button size="lg" onClick={() => setStep(2)} disabled={commitments.length === 0 || isExtracting} className="rounded-xl" data-testid="button-continue-step1">
                Continue <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <header className="space-y-2">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setStep(1)} className="-ml-2">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-3xl font-heading font-semibold text-foreground">What's due?</h1>
              </div>
              <p className="text-muted-foreground text-lg ml-11">Add any assignments or tasks you need to complete.</p>
            </header>

            {/* Columbia mode: show classes already set + Canvas-only CTA */}
            {isColumbiaMode && (
              <>
                {/* Classes already added banner */}
                <Card className="border-primary/40 bg-primary/5 shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Your class schedule is already set</p>
                        <p className="text-xs text-muted-foreground">These repeat every weekday — no setup needed.</p>
                      </div>
                    </div>
                    <div className="grid gap-2 pl-12">
                      <div className="bg-background border rounded-lg px-3 py-2 flex items-center gap-3">
                        <div className="w-1 h-8 rounded-full bg-primary shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Entrepreneurship with Daniel</p>
                          <p className="text-xs text-muted-foreground">Mon–Fri · 9:10 AM – 11:00 AM &amp; 1:10 PM – 3:00 PM</p>
                        </div>
                      </div>
                      <div className="bg-background border rounded-lg px-3 py-2 flex items-center gap-3">
                        <div className="w-1 h-8 rounded-full bg-muted-foreground/40 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Lunch</p>
                          <p className="text-xs text-muted-foreground">Mon–Fri · 11:00 AM – 1:00 PM</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Canvas CTA — primary, full-width */}
                {importedAssignments.length > 0 ? (
                  <Card className="border-primary/30 bg-primary/5 shadow-sm">
                    <CardContent className="p-5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary shrink-0">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-medium">
                          {importedAssignments.length} assignment{importedAssignments.length === 1 ? "" : "s"} imported from Canvas
                        </p>
                      </div>
                      <Button onClick={handleAddImportedAssignments} data-testid="button-import-canvas">
                        <Plus className="w-4 h-4 mr-2" /> Add to plan
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border shadow-sm">
                    <CardContent className="p-6 space-y-4 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto">
                        <BookOpen className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-lg">Connect Canvas to pull your assignments</p>
                        <p className="text-muted-foreground text-sm">
                          Your CourseWorks2 assignments will be imported automatically — due dates and all.
                        </p>
                      </div>
                      <Button
                        size="lg"
                        className="w-full rounded-xl text-base h-14"
                        onClick={() => setLocation("/integrations")}
                        data-testid="button-import-canvas"
                      >
                        <Link2 className="w-5 h-5 mr-2" />
                        Connect Canvas &amp; import assignments
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Default (non-Columbia) flow */}
            {!isColumbiaMode && (
              <>
                {importedAssignments.length > 0 && (
                  <Card className="border border-primary/30 bg-primary/5 shadow-sm">
                    <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm">
                        <span className="font-medium">{importedAssignments.length}</span> assignment(s) imported from Canvas / Google Classroom.
                      </p>
                      <Button variant="secondary" size="sm" onClick={handleAddImportedAssignments}>
                        <Plus className="w-4 h-4 mr-2" /> Add them as tasks
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Card className="border shadow-sm">
                  <CardContent className="p-6">
                    <form onSubmit={handleAddTask} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Task Title *</Label>
                          <Input placeholder="e.g. Math Worksheet" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                          <Label>Due Date *</Label>
                          <Input placeholder="e.g. tomorrow, Friday" value={newTaskDueDate} onChange={e => setNewTaskDueDate(e.target.value)} required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Estimated Time (minutes)</Label>
                        <Input type="number" placeholder="e.g. 45" value={newTaskMinutes} onChange={e => setNewTaskMinutes(e.target.value)} />
                      </div>
                      <Button type="submit" variant="secondary" className="w-full">
                        <Plus className="w-4 h-4 mr-2" /> Add Task
                      </Button>
                    </form>

                    <div className="mt-4 pt-4 border-t border-dashed">
                      <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider font-medium">Or import from</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full text-xs gap-1.5 h-8"
                          onClick={() => {
                            if (importedAssignments.length > 0) {
                              handleAddImportedAssignments();
                            } else {
                              setLocation("/integrations");
                            }
                          }}
                          data-testid="button-import-canvas"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          Canvas
                          {importedAssignments.length > 0 && (
                            <span className="bg-primary/15 text-primary rounded-full px-1.5 py-0 text-[10px] font-semibold ml-0.5">
                              {importedAssignments.length}
                            </span>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full text-xs gap-1.5 h-8"
                          onClick={() => {
                            if (importedAssignments.length > 0) {
                              handleAddImportedAssignments();
                            } else {
                              setLocation("/integrations");
                            }
                          }}
                          data-testid="button-import-classroom"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          Google Classroom
                          {importedAssignments.length > 0 && (
                            <span className="bg-primary/15 text-primary rounded-full px-1.5 py-0 text-[10px] font-semibold ml-0.5">
                              {importedAssignments.length}
                            </span>
                          )}
                        </Button>
                      </div>
                      {importedAssignments.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Not connected yet — clicking will take you to Integrations to set it up.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {tasks.length > 0 && (
              <div className="space-y-3 pt-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-primary" />
                  Your Tasks
                </h3>
                {tasks.map((t, i) => (
                  <div key={i} className="bg-card border rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{t.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">Due: {t.dueDate} {t.estimatedMinutes && `• ~${t.estimatedMinutes} mins`}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleRemoveTask(i)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-6 border-t">
              <Button
                size="lg"
                onClick={() => {
                  // Auto-add a partially filled task so nothing is lost.
                  let finalTasks = tasks;
                  if (newTaskTitle.trim() && newTaskDueDate.trim()) {
                    const pending = {
                      title: newTaskTitle.trim(),
                      dueDate: newTaskDueDate.trim(),
                      estimatedMinutes: newTaskMinutes ? parseInt(newTaskMinutes, 10) : null,
                    };
                    finalTasks = [...tasks, pending];
                    setTasks(finalTasks);
                    setNewTaskTitle("");
                    setNewTaskDueDate("");
                    setNewTaskMinutes("");
                  }
                  if (finalTasks.length === 0) {
                    toast({ title: "Add at least one task to continue.", duration: 3000 });
                    return;
                  }
                  setStep(3);
                }}
                className="rounded-xl shadow-sm"
                data-testid="button-continue-step2"
              >
                Continue <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">

            {/* ── Reveal screen: shown after generation for signed-in users ── */}
            {revealData && !isGenerating && (
              <div className="space-y-6">
                <header className="text-center space-y-3">
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h1 className="text-2xl font-heading font-semibold">Here's what we found time for</h1>
                  <p className="text-muted-foreground">Your homework and study sessions, freshly scheduled.</p>
                </header>
                <div className="space-y-3">
                  {revealData.blocks.map((block, i) => (
                    <div
                      key={block.id}
                      className="flex items-center gap-4 p-4 rounded-xl border bg-card animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both"
                      style={{ animationDelay: `${i * 90}ms` }}
                    >
                      <div className="text-xs font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2.5 py-1.5 rounded-lg shrink-0 min-w-[3rem] text-center">
                        {block.day.charAt(0).toUpperCase() + block.day.slice(1, 3)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{block.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{block.startTime} – {block.endTime}</p>
                      </div>
                      <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  ))}
                </div>
                <Button
                  size="lg"
                  className="w-full rounded-xl"
                  onClick={() => setLocation(`/schedule/${revealData.scheduleId}?reveal=1`)}
                >
                  Add to my schedule <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            )}

            {!revealData && !lockedScheduleId && (
              <header className="space-y-2 text-center mb-6">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h1 className="text-3xl font-heading font-semibold text-foreground">One last thing</h1>
                <p className="text-muted-foreground text-lg">How do you like to study?</p>
              </header>
            )}

            {!isGenerating && !lockedScheduleId && !revealData && clarifyingQuestions.length === 0 && (
              <div className="space-y-6">
                {/* Study time preference */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">When do you prefer to study?</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "morning", label: "🌅 Morning", sub: "before noon" },
                      { value: "afternoon", label: "☀️ Afternoon", sub: "noon – 5 pm" },
                      { value: "evening", label: "🌙 Evening", sub: "after 5 pm" },
                    ].map(opt => {
                      const on = studyPref.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setStudyPref(prev => on ? prev.filter(v => v !== opt.value) : [...prev, opt.value])}
                          className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-0.5 min-w-[90px] ${on ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:border-primary/50"}`}
                        >
                          <span>{opt.label}</span>
                          <span className="text-xs font-normal opacity-60">{opt.sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Focus session length */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">How long can you focus at a stretch?</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "25", label: "25 min" },
                      { value: "45", label: "45 min" },
                      { value: "60", label: "1 hour" },
                      { value: "90", label: "90 min" },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFocusLength(prev => prev === opt.value ? null : opt.value)}
                        className={`px-5 py-2.5 rounded-xl border text-sm font-medium transition-all ${focusLength === opt.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:border-primary/50"}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional notes */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Anything else? <span className="font-normal">(optional)</span></Label>
                  <Textarea
                    placeholder="e.g. keep Sundays light, no back-to-back sessions..."
                    value={prefNotes}
                    onChange={e => setPrefNotes(e.target.value)}
                    className="min-h-[72px] text-sm"
                    data-testid="input-pref-notes"
                  />
                </div>

                {/* Collapsible routine details */}
                <div className="rounded-xl border overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowRoutineDetails(v => !v)}
                  >
                    <span className="flex items-center gap-2">
                      <Sun className="w-4 h-4" /> Sleep &amp; meal times <span className="text-xs opacity-60">(optional)</span>
                    </span>
                    {showRoutineDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showRoutineDetails && (
                    <div className="px-4 pb-4 space-y-3 border-t bg-muted/30">
                      <div className="grid gap-3 sm:grid-cols-2 pt-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs flex items-center gap-1.5"><Sun className="w-3.5 h-3.5 text-primary" /> Wake-up time</Label>
                          <Input placeholder="e.g. 7:00 AM" value={wakeTime} onChange={e => setWakeTime(e.target.value)} data-testid="input-wake-time" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs flex items-center gap-1.5"><Moon className="w-3.5 h-3.5 text-primary" /> Bedtime</Label>
                          <Input placeholder="e.g. 10:30 PM" value={bedTime} onChange={e => setBedTime(e.target.value)} data-testid="input-bed-time" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1.5"><UtensilsCrossed className="w-3.5 h-3.5 text-primary" /> Meal times</Label>
                        <Input placeholder='e.g. breakfast 7:30, lunch 12, dinner 6:30' value={mealTimes} onChange={e => setMealTimes(e.target.value)} data-testid="input-meal-times" />
                      </div>
                    </div>
                  )}
                </div>

                {subStatus && !subStatus.isPro && subStatus.scheduleCount >= subStatus.scheduleLimit ? (
                  <Card className="border-2 border-primary/40 bg-primary/5 text-center p-8 space-y-4">
                    <div className="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                      <Zap className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-xl font-heading font-semibold">You've used your 2 free schedules</h2>
                      <p className="text-muted-foreground text-sm">Upgrade to Pro for unlimited AI schedule generations and no ads.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                      <Button size="lg" className="rounded-xl" onClick={() => setLocation("/pricing")}>
                        <Zap className="mr-2 w-4 h-4" /> Upgrade to Pro — $10/mo
                      </Button>
                      <Button size="lg" variant="outline" className="rounded-xl" onClick={goToSignIn}>
                        Already subscribed? Sign in
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Card className="cursor-pointer hover:border-primary hover:shadow-md transition-all text-center p-6 bg-card" onClick={() => handleGenerate("day")} data-testid="card-generate-day">
                      <CardContent className="p-0 space-y-3">
                        <CalendarDays className="w-8 h-8 mx-auto text-primary" />
                        <div>
                          <CardTitle className="text-lg">Daily Plan</CardTitle>
                          <CardDescription className="mt-1">Plan out today in detail.</CardDescription>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="cursor-pointer hover:border-primary hover:shadow-md transition-all text-center p-6 bg-card" onClick={() => handleGenerate("week")} data-testid="card-generate-week">
                      <CardContent className="p-0 space-y-3">
                        <CalendarDays className="w-8 h-8 mx-auto text-primary" />
                        <div>
                          <CardTitle className="text-lg">Weekly Plan</CardTitle>
                          <CardDescription className="mt-1">Structure your entire week.</CardDescription>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

              </div>
            )}

            {isGenerating && (
              <div className="text-center py-16 space-y-6">
                <div className="relative w-24 h-24 mx-auto">
                  <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-primary animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-medium">Crafting your schedule...</h2>
                  <p className="text-muted-foreground">Finding the perfect balance for your tasks and classes.</p>
                </div>
              </div>
            )}

            {!isGenerating && lockedScheduleId && (
              <Card className="max-w-lg mx-auto text-center shadow-lg border-primary/20 overflow-hidden" data-testid="card-schedule-locked">
                <div className="bg-primary/5 border-b border-primary/10 py-10 px-6 space-y-4">
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                    <Lock className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-2xl font-heading font-semibold">Your schedule is ready!</h2>
                    <p className="text-muted-foreground">Sign in with Google to unlock it — we'll keep everything you just built.</p>
                  </div>
                </div>
                <CardContent className="p-6 space-y-3">
                  <Button size="lg" className="w-full rounded-xl text-base" onClick={goToSignIn} data-testid="button-signin-to-view">
                    Sign in with Google to view
                  </Button>
                  <Button variant="ghost" className="w-full text-muted-foreground" onClick={goToSignUp} data-testid="button-signup-to-view">
                    New here? Create an account
                  </Button>
                </CardContent>
              </Card>
            )}

            {!isGenerating && !lockedScheduleId && clarifyingQuestions.length > 0 && (
              <Card className="shadow-md border-primary/20 max-w-xl mx-auto">
                <CardHeader className="bg-primary/5 border-b border-border/50">
                  <CardTitle>One last thing...</CardTitle>
                  <CardDescription>
                    The AI needs a little more context to build the best schedule for you.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleClarifySubmit} className="space-y-6">
                    {clarifyingQuestions.map((q, i) => (
                      <div key={i} className="space-y-3">
                        <Label className="text-base leading-relaxed">{q}</Label>
                        <Textarea
                          placeholder="Your answer..."
                          value={answers[q] || ""}
                          onChange={(e) => setAnswers(prev => ({ ...prev, [q]: e.target.value }))}
                          required
                          className="min-h-[100px]"
                        />
                      </div>
                    ))}
                    <div className="pt-4 flex gap-3">
                      <Button type="submit" className="flex-1 rounded-xl" size="lg">
                        Continue Generating
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {!isGenerating && !lockedScheduleId && clarifyingQuestions.length === 0 && (
              <div className="flex justify-center pt-4">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-2 w-4 h-4" /> Back to tasks
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5-second ad overlay for free tier users */}
      {adCountdown !== null && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm px-6">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Free plan — sponsored message</p>
              <h2 className="text-2xl font-heading font-bold">Stay on track with Tempus Pro</h2>
            </div>

            <div className="rounded-2xl border bg-card p-8 shadow-lg space-y-4">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
                <Zap className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-lg">Unlimited schedules, no ads</p>
                <p className="text-muted-foreground text-sm">
                  Pro members generate as many schedules as they need — instantly, with no wait.
                </p>
              </div>
              <Button className="w-full rounded-xl" onClick={() => setLocation("/pricing")}>
                <Zap className="mr-2 w-4 h-4" /> Upgrade to Pro — $10/month
              </Button>
            </div>

            <div className="flex flex-col items-center gap-2">
              {adCountdown > 0 ? (
                <>
                  <div className="relative w-14 h-14">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="15.9" fill="none"
                        stroke="hsl(var(--primary))" strokeWidth="3"
                        strokeDasharray={`${((5 - adCountdown) / 5) * 100} 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums">
                      {adCountdown}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Your schedule is generating — continue in {adCountdown}s</p>
                </>
              ) : (
                <>
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Almost ready…</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
