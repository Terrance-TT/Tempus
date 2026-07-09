import { useState } from "react";
import { Bug, Heart, Loader2, MessageSquarePlus } from "lucide-react";
import { useSubmitFeedback } from "@workspace/api-client-react";
import { useDeviceId } from "@/hooks/use-device-id";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const SURVEY_QUESTIONS = [
  "What is your biggest struggle with homework and managing time?",
  "What do you use currently to manage time?",
  "Walk me through the last time you missed an assignment.",
  "How would our product change your workflow?",
  "What is not useful about our product?",
  "What can we improve / features to add?",
];

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Mode = "choose" | "bug" | "survey";

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const deviceId = useDeviceId();
  const { toast } = useToast();
  const submitFeedback = useSubmitFeedback();

  const [mode, setMode] = useState<Mode>("choose");
  const [bugMessage, setBugMessage] = useState("");
  const [answers, setAnswers] = useState<string[]>(() => SURVEY_QUESTIONS.map(() => ""));

  const reset = () => {
    setMode("choose");
    setBugMessage("");
    setAnswers(SURVEY_QUESTIONS.map(() => ""));
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) reset();
  };

  const handleSubmitBug = () => {
    if (!deviceId || !bugMessage.trim()) return;
    submitFeedback.mutate(
      {
        data: {
          deviceId,
          type: "bug",
          message: bugMessage.trim(),
          page: window.location.pathname,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Bug report sent", description: "Thanks for helping us squash it!" });
          handleOpenChange(false);
        },
        onError: () => {
          toast({ title: "Couldn't send", description: "Please try again.", variant: "destructive" });
        },
      },
    );
  };

  const handleSubmitSurvey = () => {
    if (!deviceId) return;
    const filled = SURVEY_QUESTIONS.map((question, i) => ({
      question,
      answer: answers[i].trim(),
    })).filter((a) => a.answer.length > 0);
    if (filled.length === 0) {
      toast({ title: "Nothing to send yet", description: "Answer at least one question first." });
      return;
    }
    submitFeedback.mutate(
      {
        data: {
          deviceId,
          type: "survey",
          answers: filled,
          page: window.location.pathname,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "Thank you!",
            description: "Your feedback genuinely shapes what we build next.",
          });
          handleOpenChange(false);
        },
        onError: () => {
          toast({ title: "Couldn't send", description: "Please try again.", variant: "destructive" });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85dvh] overflow-y-auto">
        {mode === "choose" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquarePlus className="w-5 h-5 text-primary" />
                Send feedback
              </DialogTitle>
              <DialogDescription>
                Found something broken, or have thoughts to share? We read every single one.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 pt-2">
              <button
                onClick={() => setMode("bug")}
                className="flex items-start gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-secondary/60"
                data-testid="button-feedback-bug"
              >
                <Bug className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                <span>
                  <span className="text-sm font-medium block">Report a bug</span>
                  <span className="text-xs text-muted-foreground">
                    Quick — tell us what went wrong. This will help catch bugs.
                  </span>
                </span>
              </button>
              <button
                onClick={() => setMode("survey")}
                className="flex items-start gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-secondary/60"
                data-testid="button-feedback-survey"
              >
                <Heart className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <span>
                  <span className="text-sm font-medium block">Share your thoughts</span>
                  <span className="text-xs text-muted-foreground">
                    A few questions about how you study — your feedback is really appreciated!
                  </span>
                </span>
              </button>
            </div>
          </>
        )}

        {mode === "bug" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bug className="w-5 h-5 text-destructive" />
                Report a bug
              </DialogTitle>
              <DialogDescription>This will help catch bugs. What happened?</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Textarea
                value={bugMessage}
                onChange={(e) => setBugMessage(e.target.value)}
                placeholder="Describe what went wrong, and what you expected to happen…"
                rows={5}
                data-testid="input-bug-message"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setMode("choose")}>
                  Back
                </Button>
                <Button
                  onClick={handleSubmitBug}
                  disabled={!bugMessage.trim() || submitFeedback.isPending}
                  data-testid="button-submit-bug"
                >
                  {submitFeedback.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Send bug report
                </Button>
              </div>
            </div>
          </>
        )}

        {mode === "survey" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Share your thoughts
              </DialogTitle>
              <DialogDescription>
                Your feedback is really appreciated — it directly shapes what we build. Answer as
                many or as few as you like.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {SURVEY_QUESTIONS.map((question, i) => (
                <div key={question} className="space-y-1.5">
                  <Label className="text-sm">{question}</Label>
                  <Textarea
                    value={answers[i]}
                    onChange={(e) =>
                      setAnswers((prev) => prev.map((a, j) => (j === i ? e.target.value : a)))
                    }
                    rows={2}
                    data-testid={`input-survey-${i}`}
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Thank you! 💚</p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setMode("choose")}>
                  Back
                </Button>
                <Button
                  onClick={handleSubmitSurvey}
                  disabled={submitFeedback.isPending}
                  data-testid="button-submit-survey"
                >
                  {submitFeedback.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Send feedback
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
