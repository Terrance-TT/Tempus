import { useLocation } from "wouter";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutCancel() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
        <XCircle className="w-10 h-10" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-heading font-bold">Checkout cancelled</h1>
        <p className="text-muted-foreground">
          No worries — you haven't been charged. Your free plan is still active.
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setLocation("/")}>
          Go home
        </Button>
        <Button onClick={() => setLocation("/pricing")}>
          View plans
        </Button>
      </div>
    </div>
  );
}
