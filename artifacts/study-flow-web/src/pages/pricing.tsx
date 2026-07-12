import { useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, ArrowLeft, Loader2, Gift, Tag } from "lucide-react";
import { useSubscriptionStatus, useCreateCheckout, useManageSubscription, useProProducts } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";

export default function Pricing() {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { toast } = useToast();

  const { data: status } = useSubscriptionStatus();
  const { data: products = [] } = useProProducts();
  const createCheckout = useCreateCheckout();
  const manageSubscription = useManageSubscription();

  const proProduct = products.find((p) => p.name === "Tempus Pro");
  const proPrice = proProduct?.prices.find((p) => p.recurring?.interval === "month");

  const handleUpgrade = async () => {
    if (!user) {
      setLocation("/sign-in");
      return;
    }
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
      <div className="max-w-3xl mx-auto pt-6 pb-16 space-y-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-heading font-bold">Plans</h1>
            <p className="text-muted-foreground">Simple, transparent pricing.</p>
          </div>
        </div>

        {!status?.isPro && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-5 py-4 flex items-start gap-3">
            <Gift className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-foreground">Limited-time offer</p>
              <p className="text-muted-foreground mt-0.5">
                Start with a <strong className="text-foreground">1-month free trial</strong>, then get{" "}
                <strong className="text-foreground">50% off your second month</strong> — just $4.99 instead of $9.99.
              </p>
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-6">
          <Card className="border border-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Free</CardTitle>
                {!status?.isPro && <Badge variant="secondary">Current plan</Badge>}
              </div>
              <CardDescription>Get started for free</CardDescription>
              <div className="pt-2">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>5 AI schedule generations</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>Photo & text timetable input</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>Google Calendar sync</span>
                </li>
                <li className="flex items-start gap-2 text-muted-foreground">
                  <span className="w-4 h-4 shrink-0 mt-0.5 text-center text-xs">~</span>
                  <span>Short promo during generation</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-bl-lg">
              RECOMMENDED
            </div>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" /> Pro
                </CardTitle>
                {status?.isPro && <Badge>Current plan</Badge>}
              </div>
              <CardDescription>For serious students</CardDescription>
              <div className="pt-2 space-y-1">
                {!status?.isPro ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">Free</span>
                      <span className="text-muted-foreground text-sm">for 1 month</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1 text-sm font-medium text-primary">
                        <Tag className="w-3.5 h-3.5" />
                        Then $4.99 for month 2
                      </span>
                      <span className="text-xs text-muted-foreground">(50% off), then $9.99/mo</span>
                    </div>
                  </>
                ) : (
                  <div>
                    <span className="text-4xl font-bold">$9.99</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium">Unlimited schedule generations</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium">No ads — instant generation</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>Photo & text timetable input</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>Google Calendar sync</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span>AI schedule revisions</span>
                </li>
              </ul>

              {status?.isPro ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleManage}
                  disabled={manageSubscription.isPending}
                >
                  {manageSubscription.isPending && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                  Manage subscription
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    onClick={handleUpgrade}
                    disabled={createCheckout.isPending}
                  >
                    {createCheckout.isPending && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                    Start free trial
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    No credit card charged for 30 days
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Cancel anytime. Payments are securely processed by Stripe.
        </p>
      </div>
    </>
  );
}
