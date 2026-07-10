import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { FocusGuardCard } from "@/components/focus-guard-card";

export default function FocusGuard() {
  const [, setLocation] = useLocation();

  return (
    <>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-heading font-bold mb-2" data-testid="text-focus-guard-title">
              Focus Guard
            </h1>
            <p className="text-muted-foreground">
              Your distraction blocker, controlled entirely from here.
            </p>
          </div>
        </div>
        <FocusGuardCard />
      </div>
    </>
  );
}
