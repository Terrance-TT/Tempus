import { useState } from "react";
import { useLocation } from "wouter";
import { useDeviceId } from "@/hooks/use-device-id";
import { useGenerateSchedule, ScheduleScope, ClarificationAnswer } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, CalendarDays, Sparkles } from "lucide-react";

export default function Generate() {
  const deviceId = useDeviceId();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [step, setStep] = useState<"scope" | "generating" | "clarifying">("scope");
  const [scope, setScope] = useState<ScheduleScope>("week");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const generateSchedule = useGenerateSchedule();

  const handleGenerate = (selectedScope: ScheduleScope) => {
    if (!deviceId) return;
    setScope(selectedScope);
    setStep("generating");
    
    generateSchedule.mutate(
      { data: { deviceId, scope: selectedScope } },
      {
        onSuccess: (result) => {
          if (result.status === "needs_clarification" && result.questions) {
            setDraftId(result.id);
            setQuestions(result.questions);
            setStep("clarifying");
          } else if (result.status === "complete" && result.schedule) {
            toast({ title: "Schedule generated!" });
            setLocation(`/schedule/${result.schedule.id}`);
          } else {
            toast({ title: "Schedule generated!" });
            setLocation(`/schedule/${result.id}`);
          }
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.data?.message, variant: "destructive" });
          setStep("scope");
        }
      }
    );
  };

  const handleClarifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId || !draftId) return;
    
    const formattedAnswers: ClarificationAnswer[] = questions.map(q => ({
      question: q,
      answer: answers[q] || "No preference",
    }));

    setStep("generating");
    
    generateSchedule.mutate(
      { data: { deviceId, scope, draftId, answers: formattedAnswers } },
      {
        onSuccess: (result) => {
          if (result.status === "needs_clarification" && result.questions) {
            setDraftId(result.id);
            setQuestions(result.questions);
            setStep("clarifying");
          } else if (result.status === "complete" && result.schedule) {
            toast({ title: "Schedule generated!" });
            setLocation(`/schedule/${result.schedule.id}`);
          } else {
            toast({ title: "Schedule generated!" });
            setLocation(`/schedule/${result.id}`);
          }
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.data?.message, variant: "destructive" });
          setStep("clarifying");
        }
      }
    );
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto pt-12 pb-20">
        <header className="text-center mb-12 space-y-3">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-heading font-semibold">Generate Schedule</h1>
          <p className="text-muted-foreground text-lg">
            Let the AI craft a balanced plan based on your commitments.
          </p>
        </header>

        {step === "scope" && (
          <div className="grid gap-6 sm:grid-cols-2 animate-in fade-in slide-in-from-bottom-4">
            <Card className="cursor-pointer hover:border-primary transition-colors text-center p-6 bg-card" onClick={() => handleGenerate("day")}>
              <CardContent className="p-0 space-y-4">
                <Calendar className="w-12 h-12 mx-auto text-primary" />
                <div>
                  <CardTitle className="text-xl">Daily Plan</CardTitle>
                  <CardDescription className="mt-2">Plan out today in detail. Good for focused execution.</CardDescription>
                </div>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:border-primary transition-colors text-center p-6 bg-card" onClick={() => handleGenerate("week")}>
              <CardContent className="p-0 space-y-4">
                <CalendarDays className="w-12 h-12 mx-auto text-primary" />
                <div>
                  <CardTitle className="text-xl">Weekly Plan</CardTitle>
                  <CardDescription className="mt-2">Structure your entire week. Good for overall balance.</CardDescription>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "generating" && (
          <div className="text-center py-20 space-y-6 animate-in fade-in">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <div className="space-y-2">
              <h2 className="text-xl font-medium">Crafting your schedule...</h2>
              <p className="text-muted-foreground">The AI is analyzing your commitments and finding the best balance.</p>
            </div>
          </div>
        )}

        {step === "clarifying" && (
          <Card className="animate-in fade-in slide-in-from-bottom-4 shadow-sm border-primary/20">
            <CardHeader className="bg-primary/5 rounded-t-xl border-b border-border/50">
              <CardTitle>A few more details...</CardTitle>
              <CardDescription>
                The AI needs a little more context to build the best schedule for you.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleClarifySubmit} className="space-y-6">
                {questions.map((q, i) => (
                  <div key={i} className="space-y-3">
                    <Label htmlFor={`q-${i}`} className="text-base">{q}</Label>
                    <Input 
                      id={`q-${i}`}
                      placeholder="Your answer..."
                      value={answers[q] || ""}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [q]: e.target.value }))}
                      required
                    />
                  </div>
                ))}
                <div className="pt-4 flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep("scope")}>Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={generateSchedule.isPending}>
                    {generateSchedule.isPending ? "Generating..." : "Continue"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
