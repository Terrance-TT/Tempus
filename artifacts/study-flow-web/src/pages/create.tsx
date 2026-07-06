import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useDeviceId } from "@/hooks/use-device-id";
import { 
  useExtractCommitmentsFromImage, 
  useListCommitments, 
  useDeleteCommitment,
  useGenerateSchedule,
  getListCommitmentsQueryKey,
  Task,
  ScheduleScope,
  ClarificationAnswer
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Camera, Upload, Trash2, Plus, Clock, CalendarDays, Loader2, ArrowRight, ArrowLeft, ListTodo, Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function Create() {
  const deviceId = useDeviceId();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState(false);

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

  const { data: commitments = [], isLoading: isLoadingCommitments } = useListCommitments(
    { deviceId: deviceId || "" },
    { query: { enabled: !!deviceId, queryKey: getListCommitmentsQueryKey({ deviceId: deviceId || "" }) } }
  );

  const extractCommitments = useExtractCommitmentsFromImage();
  const deleteCommitment = useDeleteCommitment();
  const generateSchedule = useGenerateSchedule();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !deviceId) return;

    setIsExtracting(true);
    setExtractionError(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      extractCommitments.mutate(
        { data: { deviceId, imageBase64: base64 } },
        {
          onSuccess: (newCommitments) => {
            queryClient.invalidateQueries({ queryKey: getListCommitmentsQueryKey({ deviceId }) });
            setIsExtracting(false);
            if (newCommitments.length === 0) {
              setExtractionError(true);
            } else {
              toast({ title: "Extracted successfully!", description: `Found ${newCommitments.length} commitments.` });
            }
          },
          onError: () => {
            setIsExtracting(false);
            setExtractionError(true);
            toast({ title: "Extraction failed", description: "Could not read the image.", variant: "destructive" });
          }
        }
      );
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
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

  const handleGenerate = (selectedScope: ScheduleScope) => {
    if (!deviceId) return;
    setScope(selectedScope);
    setIsGenerating(true);
    setClarifyingQuestions([]);
    
    generateSchedule.mutate(
      { data: { deviceId, scope: selectedScope, tasks } },
      {
        onSuccess: (result) => {
          if (result.status === "needs_clarification" && result.questions) {
            setDraftId(result.id);
            setClarifyingQuestions(result.questions);
            setIsGenerating(false);
          } else if (result.status === "complete" && result.schedule) {
            toast({ title: "Schedule generated!" });
            setLocation(`/schedule/${result.schedule.id}`);
          }
        },
        onError: (err: any) => {
          toast({ title: "Error generating schedule", description: err?.data?.message, variant: "destructive" });
          setIsGenerating(false);
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
    
    generateSchedule.mutate(
      { data: { deviceId, scope, draftId, answers: formattedAnswers, tasks } },
      {
        onSuccess: (result) => {
          if (result.status === "needs_clarification" && result.questions) {
            setDraftId(result.id);
            setClarifyingQuestions(result.questions);
            setIsGenerating(false);
          } else if (result.status === "complete" && result.schedule) {
            toast({ title: "Schedule generated!" });
            setLocation(`/schedule/${result.schedule.id}`);
          }
        },
        onError: (err: any) => {
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
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Step {step} of 3
          </span>
        </div>

        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <header className="space-y-2">
              <h1 className="text-3xl font-heading font-semibold text-foreground">Snap your schedule</h1>
              <p className="text-muted-foreground text-lg">Take a photo of your timetable or syllabus. AI will extract your classes automatically.</p>
            </header>

            <Card className="border-dashed bg-secondary/20 hover:bg-secondary/40 transition-colors">
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
                ) : (
                  <>
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                      <Camera className="w-10 h-10" />
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button size="lg" onClick={() => fileInputRef.current?.click()} className="rounded-xl shadow-sm">
                          <Camera className="mr-2 w-5 h-5" /> Take Photo
                        </Button>
                        <Button size="lg" variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-xl bg-background">
                          <Upload className="mr-2 w-5 h-5" /> Upload Image
                        </Button>
                      </div>
                      
                      {extractionError && (
                        <p className="text-destructive text-sm mt-4">We couldn't read that clearly. Try taking another photo.</p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {commitments.length > 0 && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Your Commitments</h3>
                  <Badge variant="secondary">{commitments.length}</Badge>
                </div>
                
                <div className="grid gap-3">
                  {commitments.map((c) => (
                    <div key={c.id} className="bg-card border rounded-xl p-4 flex justify-between items-center group">
                      <div>
                        <p className="font-medium">{c.title}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <CalendarDays className="w-3.5 h-3.5" />
                          <span className="uppercase text-[10px] tracking-wider">{c.daysOfWeek.join(", ")}</span>
                          <span className="opacity-50">•</span>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{c.startTime} - {c.endTime}</span>
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteCommitment(c.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-6">
              <Button size="lg" onClick={() => setStep(2)} disabled={commitments.length === 0 || isExtracting} className="rounded-xl">
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
              </CardContent>
            </Card>

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

            <div className="flex justify-between pt-6 border-t">
              <Button variant="ghost" onClick={() => setStep(3)} className="text-muted-foreground">
                Skip for now
              </Button>
              <Button size="lg" onClick={() => setStep(3)} className="rounded-xl shadow-sm">
                Continue <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <header className="space-y-2 text-center mb-10">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8" />
              </div>
              <h1 className="text-3xl font-heading font-semibold text-foreground">Generate Plan</h1>
              <p className="text-muted-foreground text-lg">Choose your timeframe and let AI do the rest.</p>
            </header>

            {!isGenerating && clarifyingQuestions.length === 0 && (
              <div className="grid gap-6 sm:grid-cols-2 max-w-lg mx-auto">
                <Card className="cursor-pointer hover:border-primary hover:shadow-md transition-all text-center p-6 bg-card" onClick={() => handleGenerate("day")}>
                  <CardContent className="p-0 space-y-4">
                    <CalendarDays className="w-10 h-10 mx-auto text-primary" />
                    <div>
                      <CardTitle className="text-xl">Daily Plan</CardTitle>
                      <CardDescription className="mt-2">Plan out today in detail.</CardDescription>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="cursor-pointer hover:border-primary hover:shadow-md transition-all text-center p-6 bg-card" onClick={() => handleGenerate("week")}>
                  <CardContent className="p-0 space-y-4">
                    <CalendarDays className="w-10 h-10 mx-auto text-primary" />
                    <div>
                      <CardTitle className="text-xl">Weekly Plan</CardTitle>
                      <CardDescription className="mt-2">Structure your entire week.</CardDescription>
                    </div>
                  </CardContent>
                </Card>
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

            {!isGenerating && clarifyingQuestions.length > 0 && (
              <Card className="shadow-md border-primary/20 max-w-xl mx-auto">
                <CardHeader className="bg-primary/5 border-b border-border/50">
                  <CardTitle>A quick question...</CardTitle>
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
            
            {!isGenerating && clarifyingQuestions.length === 0 && (
              <div className="flex justify-center pt-8">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-2 w-4 h-4" /> Back to tasks
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
