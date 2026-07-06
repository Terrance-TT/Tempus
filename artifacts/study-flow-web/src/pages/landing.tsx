import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Camera, Sparkles, CalendarCheck2 } from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="max-w-xl w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
          <Calendar className="w-8 h-8" />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-heading font-bold text-foreground">StudyFlow</h1>
          <p className="text-muted-foreground text-lg">
            Snap a photo of your timetable, tell us what's due, and get a balanced AI-built schedule — synced straight to your Google Calendar.
          </p>
        </div>

        <Card className="p-6 grid gap-4 sm:grid-cols-3 text-left bg-secondary/10 border-dashed shadow-none">
          <div className="space-y-2">
            <Camera className="w-5 h-5 text-primary" />
            <p className="text-sm font-medium text-foreground">Photo-first setup</p>
          </div>
          <div className="space-y-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <p className="text-sm font-medium text-foreground">AI-balanced schedule</p>
          </div>
          <div className="space-y-2">
            <CalendarCheck2 className="w-5 h-5 text-primary" />
            <p className="text-sm font-medium text-foreground">Synced to Google Calendar</p>
          </div>
        </Card>

        <Button
          size="lg"
          className="w-full text-lg py-6 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
          onClick={() => setLocation("/sign-in")}
        >
          Continue with Google
        </Button>
        <p className="text-xs text-muted-foreground">
          Each student signs in with their own Google account to keep their schedule and calendar private.
        </p>
      </div>
    </div>
  );
}
