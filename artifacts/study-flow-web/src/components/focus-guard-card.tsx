import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useDeviceId } from "@/hooks/use-device-id";
import { useSubscriptionStatus } from "@/hooks/use-subscription";
import {
  useCreateExtensionToken,
  useGetFocusGuardSettings,
  getGetFocusGuardSettingsQueryKey,
  useUpdateFocusGuardSettings,
  useGetFocusGuardAnalytics,
  getGetFocusGuardAnalyticsQueryKey,
  type FocusGuardSettings,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldCheck,
  Download,
  Copy,
  Check,
  Loader2,
  Plus,
  X,
  Clock,
  BarChart3,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function FocusGuardCard() {
  const deviceId = useDeviceId();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [connectionCode, setConnectionCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [newSite, setNewSite] = useState("");
  const [switchHidden, setSwitchHidden] = useState<boolean | null>(null);

  const createExtensionToken = useCreateExtensionToken();
  const { data: subStatus } = useSubscriptionStatus();
  const isPro = !!subStatus?.isPro;

  const settingsQueryKey = getGetFocusGuardSettingsQueryKey({ deviceId: deviceId || "" });
  const { data: settings, isLoading } = useGetFocusGuardSettings(
    { deviceId: deviceId || "" },
    { query: { enabled: !!deviceId, queryKey: settingsQueryKey } },
  );
  const updateSettings = useUpdateFocusGuardSettings();

  const { data: analytics } = useGetFocusGuardAnalytics(
    { deviceId: deviceId || "" },
    {
      query: {
        enabled: !!deviceId && isPro,
        queryKey: getGetFocusGuardAnalyticsQueryKey({ deviceId: deviceId || "" }),
      },
    },
  );

  const hideSwitch = switchHidden ?? settings?.hideActivateSwitch ?? false;

  const applyUpdate = (patch: Partial<FocusGuardSettings>) => {
    if (!deviceId || !settings) return;
    // Read the latest cached settings (not the render snapshot) and send the
    // full merged state so rapid successive updates can't drop each other.
    const current = queryClient.getQueryData<FocusGuardSettings>(settingsQueryKey) ?? settings;
    const next: FocusGuardSettings = { ...current, ...patch };
    // Invariant (mirrors server): commit mode forces blocking on.
    if (next.hideActivateSwitch) next.active = true;
    // Optimistic cache update so toggles feel instant.
    queryClient.setQueryData(settingsQueryKey, next);
    updateSettings.mutate(
      { data: { deviceId, ...next } },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(settingsQueryKey, updated);
        },
        onError: () => {
          queryClient.invalidateQueries({ queryKey: settingsQueryKey });
          toast({ title: "Couldn't save", description: "Please try again.", variant: "destructive" });
        },
      },
    );
  };

  const handleAddSite = () => {
    const domain = newSite
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/[/?#].*$/, "");
    if (!domain || !domain.includes(".")) {
      toast({ title: "Enter a valid site", description: "For example: youtube.com", variant: "destructive" });
      return;
    }
    if (settings?.blockedSites.includes(domain)) {
      toast({
        title: "Already blocked",
        description: `${domain} is already in your blocked sites list.`,
      });
      setNewSite("");
      return;
    }
    applyUpdate({ blockedSites: [...(settings?.blockedSites ?? []), domain] });
    setNewSite("");
  };

  const handleRemoveSite = (domain: string) => {
    applyUpdate({ blockedSites: (settings?.blockedSites ?? []).filter((s) => s !== domain) });
  };

  const handleGenerateCode = () => {
    if (!deviceId) return;
    const rotate = connectionCode !== null;
    createExtensionToken.mutate(
      { data: { deviceId, rotate } },
      {
        onSuccess: ({ token }) => {
          const apiUrl = `${window.location.origin}/api`;
          const base = (import.meta.env.BASE_URL as string).replace(/\/$/, "");
          const homeUrl = `${window.location.origin}${base}/focus-guard`;
          setConnectionCode(btoa(JSON.stringify({ apiUrl, token, homeUrl })));
          setCodeCopied(false);
        },
        onError: () => {
          toast({ title: "Couldn't generate code", description: "Please try again.", variant: "destructive" });
        },
      },
    );
  };

  const handleCopyCode = async () => {
    if (!connectionCode) return;
    await navigator.clipboard.writeText(connectionCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  return (
    <Card className="border shadow-sm" data-testid="card-focus-guard">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <ShieldCheck className="w-5 h-5 text-primary" />
          Tempus Focus 4
          <Badge variant="outline" className="ml-auto rounded-full">Chrome extension</Badge>
        </CardTitle>
        <CardDescription>
          Blocks distracting sites while you're supposed to be working. The extension itself is
          just a clock \u2014 everything is controlled from here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Setup */}
        <div className="space-y-3">
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Download the extension and unzip it.</li>
            <li>
              In Chrome, open <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">chrome://extensions</span>,
              turn on <strong>Developer mode</strong>, click <strong>Load unpacked</strong> and pick the unzipped folder.
            </li>
            <li>Generate your connection code and paste it into the extension popup.</li>
          </ol>
          <div className="flex flex-wrap gap-3">
            <a href={`${import.meta.env.BASE_URL}tempus-focus-4.zip`} download>
              <Button variant="outline" data-testid="button-download-extension">
                <Download className="w-4 h-4 mr-2" />
                Download extension
              </Button>
            </a>
            <Button
              onClick={handleGenerateCode}
              disabled={createExtensionToken.isPending || !deviceId}
              data-testid="button-generate-code"
            >
              {createExtensionToken.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {connectionCode ? "Regenerate connection code" : "Get connection code"}
            </Button>
          </div>
          {connectionCode && (
            <div className="space-y-2">
              <Label>Your connection code</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={connectionCode}
                  className="font-mono text-xs"
                  onFocus={(e) => e.currentTarget.select()}
                  data-testid="input-connection-code"
                />
                <Button variant="outline" size="icon" onClick={handleCopyCode} data-testid="button-copy-code">
                  {codeCopied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste this into the Focus Guard popup in Chrome. Keep it private \u2014 regenerating invalidates the old code.
              </p>
            </div>
          )}
        </div>

        <Separator />

        {isLoading || !settings ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-2/3" />
          </div>
        ) : (
          <>
            {/* Activate / deactivate */}
            <div className="space-y-3">
              {!hideSwitch && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Blocking enabled</p>
                    <p className="text-xs text-muted-foreground">Turn Focus Guard on or off.</p>
                  </div>
                  <Switch
                    checked={settings.active}
                    onCheckedChange={(checked) => applyUpdate({ active: checked })}
                    data-testid="switch-active"
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    {hideSwitch ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    Hide the on/off switch
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Commit mode \u2014 hide the switch so you can't turn blocking off on a whim.
                  </p>
                </div>
                <Switch
                  checked={hideSwitch}
                  onCheckedChange={(checked) => {
                    setSwitchHidden(checked);
                    // Hiding the switch forces blocking on \u2014 otherwise it's a trap.
                    applyUpdate(checked ? { hideActivateSwitch: true, active: true } : { hideActivateSwitch: false });
                  }}
                  data-testid="switch-hide-activate"
                />
              </div>
            </div>

            <Separator />

            {/* Blocking mode */}
            <div className="space-y-3">
              <p className="text-sm font-medium">When should sites be blocked?</p>
              <RadioGroup
                value={settings.blockMode}
                onValueChange={(value) => applyUpdate({ blockMode: value as FocusGuardSettings["blockMode"] })}
                className="gap-3"
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <RadioGroupItem value="work_blocks" id="mode-work" className="mt-0.5" data-testid="radio-mode-work" />
                  <span>
                    <span className="text-sm font-medium block">Only during work blocks</span>
                    <span className="text-xs text-muted-foreground">Blocked while a homework or study block is on your schedule.</span>
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <RadioGroupItem value="non_free" id="mode-nonfree" className="mt-0.5" data-testid="radio-mode-nonfree" />
                  <span>
                    <span className="text-sm font-medium block">Whenever it's not free time</span>
                    <span className="text-xs text-muted-foreground">Blocked during class, work blocks \u2014 anything that isn't a break.</span>
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <RadioGroupItem value="always" id="mode-always" className="mt-0.5" data-testid="radio-mode-always" />
                  <span>
                    <span className="text-sm font-medium block">All day</span>
                    <span className="text-xs text-muted-foreground">Blocked around the clock, no schedule needed \u2014 great for testing the extension.</span>
                  </span>
                </label>
              </RadioGroup>
            </div>

            <Separator />

            {/* Clock */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Show the clock
                </p>
                <p className="text-xs text-muted-foreground">
                  A minimal countdown in the extension showing time left on your current assignment.
                </p>
              </div>
              <Switch
                checked={settings.showClock}
                onCheckedChange={(checked) => applyUpdate({ showClock: checked })}
                data-testid="switch-show-clock"
              />
            </div>

            <Separator />

            {/* Blocked sites */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Blocked sites</p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. youtube.com"
                  value={newSite}
                  onChange={(e) => setNewSite(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSite();
                    }
                  }}
                  data-testid="input-add-site"
                />
                <Button variant="outline" onClick={handleAddSite} data-testid="button-add-site">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.blockedSites.length === 0 && (
                  <p className="text-xs text-muted-foreground">No sites on the list \u2014 add some above.</p>
                )}
                {settings.blockedSites.map((site) => (
                  <Badge key={site} variant="secondary" className="gap-1 pr-1" data-testid={`badge-site-${site}`}>
                    {site}
                    <button
                      onClick={() => handleRemoveSite(site)}
                      className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                      aria-label={`Remove ${site}`}
                      data-testid={`button-remove-${site}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Analytics (Pro) */}
            <div className="space-y-3">
              <div className="text-sm font-medium flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                Where your time goes
                <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">Pro</Badge>
              </div>
              {!isPro ? (
                <div className="rounded-lg border bg-muted/40 p-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    See which sites eat the most of your time, tracked by the extension over the last week.
                  </p>
                  <Button size="sm" onClick={() => setLocation("/pricing")} data-testid="button-upgrade-analytics">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Upgrade
                  </Button>
                </div>
              ) : !analytics || analytics.totals.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No activity yet. Once the extension is connected, your most-used sites over the last 7 days will show up here.
                </p>
              ) : (
                <div className="space-y-1.5" data-testid="list-analytics">
                  {(() => {
                    const max = analytics.totals[0]?.seconds || 1;
                    return analytics.totals.slice(0, 8).map((row) => (
                      <div key={row.domain} className="flex items-center gap-3">
                        <span className="text-xs w-32 truncate">{row.domain}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.max(4, (row.seconds / max) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-14 text-right">{formatDuration(row.seconds)}</span>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
