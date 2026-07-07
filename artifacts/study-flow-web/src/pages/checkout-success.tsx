import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
    const t = setTimeout(() => setLocation("/"), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        <CheckCircle2 className="w-10 h-10" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-heading font-bold">You're Pro!</h1>
        <p className="text-muted-foreground">Welcome to Tempus Pro — enjoy unlimited schedules and no ads.</p>
      </div>
      <Button onClick={() => setLocation("/create")}>Start generating</Button>
      <p className="text-xs text-muted-foreground">Redirecting you home in a moment…</p>
    </div>
  );
}
