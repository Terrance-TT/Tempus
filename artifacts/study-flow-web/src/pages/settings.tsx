import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/hooks/use-theme";
import { Sun, Moon, Chrome, Check, ArrowLeft, Zap, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscriptionStatus, useCreateCheckout, useManageSubscription, useProProducts } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";

function SettingsIcon() {
  return (
    <span className="w-14 h-14 rounded-full bg-primary/20 shrink-0 relative block">
      <span className="absolute -top-0.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
      <span className="absolute top-1/2 left-1/2 flex items-center gap-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45">
        <span className="w-2 h-16 rounded-full bg-primary" />
        <span className="w-2 h-16 rounded-full bg-primary" />
      </span>
    </span>
  );
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const { mode, setMode, presetId, setPresetId, presets } = useTheme();
  const { toast } = useToast();

  const { data: status } = useSubscriptionStatus();
  const { data: products = [] } = useProProducts();
  const createCheckout = useCreateCheckout();
  const manageSubscription = useManageSubscription();

  const proProduct = products.find((p) => p.name === "Tempus Pro");
  const proPrice = proProduct?.prices.find((p) => p.recurring?.interval === "month");

  const handleUpgrade = async () => {
    if (!proPrice) {
      toast({ title: "Plan not available", description: "Please try again shortly.", variant: "destructive" });
      return;
    }
    try {
      const { url } = await createCheckout.mutateAsync(proPrice.id);
      window.location.href = url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleManage = async () => {
    try {
      const { url } = await manageSubscription.mutateAsync();
      window.location.href = url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <>
      <div className="space-y-8 max-w-2xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="-ml-2 shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <SettingsIcon />
          <div>
            <h1 className="text-3xl font-heading font-bold" data-testid="text-settings-title">
              Settings
            </h1>
            <p className="text-muted-foreground">Make Tempus look and feel like yours.</p>
          </div>
        </div>

        <Card className="p-6 space-y-4">
          <div>
            <h2 className="font-heading font-semibold text-lg">Appearance</h2>
            <p className="text-sm text-muted-foreground">Choose how Tempus looks on this device.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode("light")}
              data-testid="button-theme-light"
              className={cn(
                "flex items-center gap-3 rounded-xl border p-4 transition-all duration-200",
                mode === "light"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:bg-secondary/40"
              )}
            >
              <span className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                <Sun className="w-4 h-4 text-foreground" />
              </span>
              <span className="text-sm font-medium">Light</span>
              {mode === "light" && <Check className="w-4 h-4 text-primary ml-auto" />}
            </button>
            <button
              onClick={() => setMode("dark")}
              data-testid="button-theme-dark"
              className={cn(
                "flex items-center gap-3 rounded-xl border p-4 transition-all duration-200",
                mode === "dark"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:bg-secondary/40"
              )}
            >
              <span className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                <Moon className="w-4 h-4 text-foreground" />
              </span>
              <span className="text-sm font-medium">Dark</span>
              {mode === "dark" && <Check className="w-4 h-4 text-primary ml-auto" />}
            </button>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading font-semibold text-lg flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> Subscription
              </h2>
              <p className="text-sm text-muted-foreground">Test the Stripe checkout flow.</p>
            </div>
            <Badge variant={status?.isPro ? "default" : "secondary"} data-testid="badge-subscription-status">
              {status?.isPro ? "Pro" : "Free"}
            </Badge>
          </div>
          {status?.isPro ? (
            <Button
              variant="outline"
              onClick={handleManage}
              disabled={manageSubscription.isPending}
              data-testid="button-manage-subscription"
            >
              {manageSubscription.isPending && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              Manage subscription
            </Button>
          ) : (
            <Button
              onClick={handleUpgrade}
              disabled={createCheckout.isPending}
              data-testid="button-go-pro"
            >
              {createCheckout.isPending && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              <Zap className="mr-2 w-4 h-4" /> Go Pro
            </Button>
          )}
        </Card>

        <Card className="p-6 space-y-4">
          <div>
            <h2 className="font-heading font-semibold text-lg">Accent color</h2>
            <p className="text-sm text-muted-foreground">Pick the color that shows up across buttons and highlights.</p>
          </div>
          <div className="grid grid-cols-5 gap-3" data-testid="grid-color-presets">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setPresetId(preset.id)}
                aria-label={preset.label}
                data-testid={`button-preset-${preset.id}`}
                className="flex flex-col items-center gap-2 group"
              >
                <span
                  className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ring-2 ring-offset-2 ring-offset-card",
                    presetId === preset.id ? "ring-foreground/70" : "ring-transparent group-hover:ring-border"
                  )}
                  style={{ backgroundColor: preset.swatch }}
                >
                  {presetId === preset.id && <Check className="w-4 h-4 text-white" />}
                </span>
                <span className="text-xs text-muted-foreground">{preset.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div>
            <h2 className="font-heading font-semibold text-lg">Browser extension</h2>
            <p className="text-sm text-muted-foreground">Manage the Tempus extension's own settings.</p>
          </div>
          <button
            disabled
            title="Coming soon — link this once the extension is published"
            data-testid="button-extension-settings"
            className="w-full flex items-center gap-3 rounded-xl border border-border p-4 text-left opacity-60 cursor-not-allowed"
          >
            <span className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
              <Chrome className="w-4 h-4 text-foreground" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-medium">Chrome extension settings</span>
              <span className="block text-xs text-muted-foreground">Coming soon</span>
            </span>
          </button>
        </Card>
      </div>
    </>
  );
}
