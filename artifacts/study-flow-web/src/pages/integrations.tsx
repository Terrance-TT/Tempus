import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useDeviceId } from "@/hooks/use-device-id";
import {
  useGetIntegrationsStatus,
  getGetIntegrationsStatusQueryKey,
  useConnectCanvas,
  useDisconnectCanvas,
  useImportCanvasAssignments,
  useImportClassroomAssignments,
  useConnectSchoology,
  useDisconnectSchoology,
  useImportSchoologyAssignments,
  useListAssignments,
  getListAssignmentsQueryKey,
  useDeleteAssignment,
  usePreviewSpsEngageIcs,
  useImportSpsEngageEvents,
  type SpsEvent,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { FocusGuardCard } from "@/components/focus-guard-card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen,
  GraduationCap,
  Trash2,
  ExternalLink,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Plug,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  PartyPopper,
  ShieldCheck,
} from "lucide-react";

import { isFunEvent } from "@/lib/sps-events";

type Panel = "canvas" | "sps" | "classroom" | "schoology" | "focusguard" | null;

interface Tool {
  id: Exclude<Panel, null>;
  name: string;
  icon: typeof BookOpen;
  iconClass: string;
  description: string;
  connected: boolean;
  badgeText?: string;
}

function formatDue(dueDate: string): string {
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) return dueDate;
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function Integrations() {
  const deviceId = useDeviceId();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isColumbiaPreset = !!sessionStorage.getItem("columbiaPreset");
  const [canvasUrl, setCanvasUrl] = useState(
    isColumbiaPreset ? "https://courseworks2.columbia.edu/" : ""
  );
  const [canvasToken, setCanvasToken] = useState("");
  const autoImportTriggered = useRef(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [spsIcsUrl, setSpsIcsUrl] = useState("");
  const [spsEvents, setSpsEvents] = useState<SpsEvent[] | null>(null);
  const [spsSelected, setSpsSelected] = useState<Set<string>>(new Set());
  const [spsFunOnly, setSpsFunOnly] = useState(false);
  const previewSpsIcs = usePreviewSpsEngageIcs();
  const importSpsEvents = useImportSpsEngageEvents();

  const [openPanel, setOpenPanel] = useState<Panel>(null);

  const togglePanel = (panel: Panel) =>
    setOpenPanel((prev) => (prev === panel ? null : panel));

  const spsDisplayed = spsFunOnly && spsEvents
    ? spsEvents.filter((ev) => isFunEvent(ev.title))
    : spsEvents ?? [];


  const { data: status, isLoading: isLoadingStatus } = useGetIntegrationsStatus(
    { deviceId: deviceId || "" },
    { query: { enabled: !!deviceId, queryKey: getGetIntegrationsStatusQueryKey({ deviceId: deviceId || "" }) } },
  );

  const { data: assignments = [], isLoading: isLoadingAssignments } = useListAssignments(
    { deviceId: deviceId || "" },
    { query: { enabled: !!deviceId, queryKey: getListAssignmentsQueryKey({ deviceId: deviceId || "" }) } },
  );

  const tools: Tool[] = [
    {
      id: "canvas",
      name: "Canvas LMS",
      icon: BookOpen,
      iconClass: "bg-primary/10 text-primary",
      description: "Import upcoming assignments from your Canvas courses",
      connected: !!status?.canvasConnected,
    },
    {
      id: "sps",
      name: "SPS Engage",
      icon: Calendar,
      iconClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      description: "Add events from your SPS Engage calendar as fixed schedule blocks",
      connected: false,
      badgeText: "Columbia students",
    },
    {
      id: "classroom",
      name: "Google Classroom",
      icon: GraduationCap,
      iconClass: "bg-primary/10 text-primary",
      description: "Import upcoming coursework from your Google Classroom classes",
      connected: !!status?.classroomConnected,
    },
    {
      id: "schoology",
      name: "Schoology",
      icon: GraduationCap,
      iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      description: "Import upcoming assignments from your Schoology courses",
      connected: !!status?.schoologyConnected,
    },
    {
      id: "focusguard",
      name: "Focus Guard",
      icon: ShieldCheck,
      iconClass: "bg-primary/10 text-primary",
      description: "Blocks distracting sites while you're supposed to be working",
      connected: false,
    },
  ];
  const activeTool = tools.find((t) => t.id === openPanel);

  const [schoologyDomain, setSchoologyDomain] = useState("api.schoology.com");
  const [schoologyKey, setSchoologyKey] = useState("");
  const [schoologySecret, setSchoologySecret] = useState("");

  const connectCanvas = useConnectCanvas();
  const disconnectCanvas = useDisconnectCanvas();
  const importCanvas = useImportCanvasAssignments();
  const importClassroom = useImportClassroomAssignments();
  const connectSchoology = useConnectSchoology();
  const disconnectSchoology = useDisconnectSchoology();
  const importSchoology = useImportSchoologyAssignments();
  const deleteAssignment = useDeleteAssignment();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetIntegrationsStatusQueryKey({ deviceId: deviceId || "" }) });
    queryClient.invalidateQueries({ queryKey: getListAssignmentsQueryKey({ deviceId: deviceId || "" }) });
  };

  const handleImportClassroom = (options?: { allowRedirect?: boolean }) => {
    if (!deviceId) return;
    const allowRedirect = options?.allowRedirect ?? true;
    importClassroom.mutate(
      { data: { deviceId } },
      {
        onSuccess: (result) => {
          invalidate();
          toast({
            title: "Google Classroom imported",
            description:
              result.importedCount > 0
                ? `${result.importedCount} new assignment(s) added.`
                : "You're up to date — no new assignments.",
          });
        },
        onError: (err: any) => {
          if (allowRedirect && (err?.status === 409 || err?.status === 401)) {
            const returnTo = `${window.location.pathname}?classroom=connected`;
            window.location.href = `/api/google-calendar/connect?returnTo=${encodeURIComponent(returnTo)}`;
            return;
          }
          toast({
            title: "Import failed",
            description: err?.data?.message ?? "Google Classroom import failed. Please try again.",
            variant: "destructive",
          });
        },
      },
    );
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("classroom") && !autoImportTriggered.current && deviceId) {
      autoImportTriggered.current = true;
      window.history.replaceState(null, "", window.location.pathname);
      toast({ title: "Google account connected" });
      handleImportClassroom({ allowRedirect: false });
    }
    if (params.has("googleCalendarError")) {
      window.history.replaceState(null, "", window.location.pathname);
      toast({
        title: "Google connection failed",
        description: params.get("googleCalendarError") ?? undefined,
        variant: "destructive",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  const handleConnectCanvas = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId) return;
    connectCanvas.mutate(
      { data: { deviceId, baseUrl: canvasUrl, accessToken: canvasToken } },
      {
        onSuccess: () => {
          setCanvasToken("");
          sessionStorage.removeItem("columbiaPreset");
          invalidate();
          toast({ title: "Canvas connected", description: "You can now import your assignments." });
        },
        onError: (err: any) => {
          toast({ title: "Couldn't connect Canvas", description: err?.data?.message, variant: "destructive" });
        },
      },
    );
  };

  const handleDisconnectCanvas = () => {
    if (!deviceId) return;
    disconnectCanvas.mutate(
      { params: { deviceId } },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Canvas disconnected" });
        },
      },
    );
  };

  const handleImportCanvas = () => {
    if (!deviceId) return;
    importCanvas.mutate(
      { data: { deviceId } },
      {
        onSuccess: (result) => {
          invalidate();
          toast({
            title: "Canvas imported",
            description:
              result.importedCount > 0
                ? `${result.importedCount} new assignment(s) added.`
                : "You're up to date — no new assignments.",
          });
        },
        onError: (err: any) => {
          toast({ title: "Import failed", description: err?.data?.message, variant: "destructive" });
        },
      },
    );
  };

  const handleConnectSchoology = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId) return;
    connectSchoology.mutate(
      { data: { deviceId, domain: schoologyDomain, consumerKey: schoologyKey, consumerSecret: schoologySecret } },
      {
        onSuccess: () => {
          setSchoologyKey("");
          setSchoologySecret("");
          setSchoologyDomain("api.schoology.com");
          invalidate();
          toast({ title: "Schoology connected", description: "You can now import your assignments." });
        },
        onError: (err: any) => {
          toast({ title: "Couldn't connect Schoology", description: err?.data?.message, variant: "destructive" });
        },
      },
    );
  };

  const handleDisconnectSchoology = () => {
    if (!deviceId) return;
    disconnectSchoology.mutate(
      { params: { deviceId } },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Schoology disconnected" });
        },
      },
    );
  };

  const handleImportSchoology = () => {
    if (!deviceId) return;
    importSchoology.mutate(
      { data: { deviceId } },
      {
        onSuccess: (result) => {
          invalidate();
          toast({
            title: "Schoology imported",
            description:
              result.importedCount > 0
                ? `${result.importedCount} new assignment(s) added.`
                : "You're up to date — no new assignments.",
          });
        },
        onError: (err: any) => {
          toast({ title: "Import failed", description: err?.data?.message, variant: "destructive" });
        },
      },
    );
  };

  const handleDeleteAssignment = (id: string) => {
    if (!deviceId) return;
    deleteAssignment.mutate(
      { id, params: { deviceId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAssignmentsQueryKey({ deviceId: deviceId || "" }) });
        },
      },
    );
  };

  const handleSpsPreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spsIcsUrl) return;
    setSpsEvents(null);
    setSpsSelected(new Set());
    previewSpsIcs.mutate(
      { data: { icsUrl: spsIcsUrl, deviceId: deviceId || undefined } },
      {
        onSuccess: (events) => {
          setSpsEvents(events);
          setSpsSelected(new Set(events.map((ev) => ev.uid)));
          localStorage.setItem("spsIcsUrl", spsIcsUrl);
        },
        onError: (err: any) => {
          toast({
            title: "Couldn't load events",
            description: err?.data?.message ?? "Check your ICS URL and try again.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleSpsImport = () => {
    if (!spsEvents || spsSelected.size === 0) return;
    const toImport = spsEvents.filter((ev) => spsSelected.has(ev.uid));
    importSpsEvents.mutate(
      { data: { deviceId: deviceId || undefined, events: toImport } },
      {
        onSuccess: (result) => {
          toast({
            title: "Events added",
            description: `${result.length} SPS Engage event${result.length === 1 ? "" : "s"} added as fixed blocks in your schedule.`,
          });
          setSpsEvents(null);
          setSpsIcsUrl("");
          setSpsSelected(new Set());
          setOpenPanel(null);
        },
        onError: () => {
          toast({ title: "Import failed. Please try again.", variant: "destructive" });
        },
      },
    );
  };

  return (
    <Layout>
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-heading font-semibold text-foreground flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Plug className="w-5 h-5" />
            </span>
            Integrations
          </h1>
          <p className="text-muted-foreground text-lg">
            Connect your school tools to pull assignments straight into your study plans.
          </p>
        </header>

        {/* Imported assignments — shown at top when assignments exist */}
        {(isLoadingAssignments || assignments.length > 0) && (
          <section className="space-y-3">
            <h2 className="font-semibold text-xl flex items-center gap-2">
              Imported Assignments
              {assignments.length > 0 && <Badge variant="secondary">{assignments.length}</Badge>}
            </h2>
            {isLoadingAssignments ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="space-y-3">
                <Card className="border-primary/30 bg-primary/5 shadow-sm" data-testid="card-generate-from-imports">
                  <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <p className="text-sm">
                        Ready to plan? Turn these {assignments.length} assignment{assignments.length === 1 ? "" : "s"} into a balanced schedule.
                      </p>
                    </div>
                    <Button onClick={() => setLocation("/create?fromImport=1")} data-testid="button-generate-from-imports">
                      Generate schedule <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
                {assignments.map((a) => (
                  <div key={a.id} className="bg-card border rounded-xl overflow-hidden">
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{a.title}</p>
                        <p className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2">
                          {a.courseName && <span>{a.courseName}</span>}
                          <span>Due {formatDue(a.dueDate)}</span>
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {a.source === "canvas" ? "Canvas" : a.source === "schoology" ? "Schoology" : "Classroom"}
                          </Badge>
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground"
                          onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                          title={expandedId === a.id ? "Hide details" : "Preview details"}
                        >
                          {expandedId === a.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                        {a.url && (
                          <a href={a.url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="text-muted-foreground" title="Open in Canvas">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDeleteAssignment(a.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {expandedId === a.id && (
                      <div className="px-4 pb-4 pt-0 border-t bg-muted/30">
                        {a.description ? (
                          <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed pt-3">
                            {a.description}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic pt-3">
                            No description available for this assignment.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Integration tiles — minimal; details appear when a tile is clicked */}
        <section className="space-y-3">
          <h2 className="font-semibold text-xl">Connect a tool</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {tools.map((tool) => {
              const isOpen = openPanel === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => togglePanel(tool.id)}
                  aria-expanded={isOpen}
                  data-testid={`tile-${tool.id}`}
                  className={cn(
                    "relative aspect-[2/1] rounded-2xl border bg-card flex flex-col items-center justify-center gap-1.5 p-3 transition-all duration-200 hover:shadow-sm hover:border-primary/40",
                    isOpen && "border-primary ring-1 ring-primary/40 shadow-sm",
                  )}
                >
                  {tool.connected && (
                    <span className="absolute top-2 right-2 text-primary" title="Connected">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  )}
                  <span className={cn("w-12 h-12 rounded-xl flex items-center justify-center", tool.iconClass)}>
                    <tool.icon className="w-7 h-7" />
                  </span>
                  <span className="text-base font-medium leading-tight text-center">{tool.name}</span>
                </button>
              );
            })}
          </div>

          {activeTool && openPanel !== "focusguard" && (
            <Card className="border shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
              <button
                type="button"
                className="w-full text-left hover:bg-muted/40 transition-colors"
                onClick={() => setOpenPanel(null)}
                aria-expanded
              >
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", activeTool.iconClass)}>
                    <activeTool.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{activeTool.name}</span>
                      {activeTool.badgeText && (
                        <Badge className="text-xs bg-blue-600 text-white border-0 hover:bg-blue-600">{activeTool.badgeText}</Badge>
                      )}
                      {activeTool.connected && (
                        <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                          <CheckCircle2 className="w-3 h-3" /> Connected
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{activeTool.description}</p>
                  </div>
                  <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
                </div>
              </button>

              <div className="px-5 pb-5 border-t pt-5">
                {openPanel === "canvas" && (
                  <div className="space-y-4">
                  {isLoadingStatus ? (
                    <Skeleton className="h-24 w-full" />
                  ) : status?.canvasConnected ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Connected to <span className="font-medium text-foreground">{status.canvasBaseUrl}</span>
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Button onClick={handleImportCanvas} disabled={importCanvas.isPending}>
                          {importCanvas.isPending
                            ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            : <RefreshCw className="w-4 h-4 mr-2" />}
                          Import assignments
                        </Button>
                        <Button variant="outline" onClick={handleDisconnectCanvas} disabled={disconnectCanvas.isPending}>
                          Disconnect
                        </Button>
                      </div>
                    </>
                  ) : (
                    <form onSubmit={handleConnectCanvas} className="space-y-4">
                      <div className="space-y-2">
                        <Label>School Canvas URL</Label>
                        <Input
                          placeholder="https://myschool.instructure.com"
                          value={canvasUrl}
                          onChange={(e) => setCanvasUrl(e.target.value)}
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Open Canvas in your browser and copy the first part of the address bar — usually <span className="font-mono">https://schoolname.instructure.com</span>
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Access Token</Label>
                        <Input
                          type="password"
                          placeholder="Paste your Canvas access token"
                          value={canvasToken}
                          onChange={(e) => setCanvasToken(e.target.value)}
                          required
                        />
                        {isColumbiaPreset ? (
                          <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
                            <p className="text-xs font-medium text-foreground">How to get your CourseWorks2 token:</p>
                            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                              <li>Sign in to <span className="font-mono bg-background px-1 rounded">courseworks2.columbia.edu</span></li>
                              <li>Click your profile picture (top-right) → <strong>Settings</strong></li>
                              <li>Scroll down to <strong>Approved Integrations</strong></li>
                              <li>Click <strong>+ New Access Token</strong></li>
                              <li>Enter a purpose (e.g. <em>Tempus</em>) — leave expiry blank</li>
                              <li>Click <strong>Generate Token</strong> and copy it immediately</li>
                            </ol>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            In Canvas: Account → Settings → New Access Token
                          </p>
                        )}
                      </div>
                      <Button type="submit" className="w-full" disabled={connectCanvas.isPending}>
                        {connectCanvas.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Connect Canvas
                      </Button>
                    </form>
                  )}
                  </div>
                )}

                {openPanel === "sps" && (
                  <div className="space-y-4">
                  <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
                    <p className="text-xs font-medium">How to get your ICS feed URL:</p>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Sign in at <a href="https://spscolumbia.campusgroups.com" target="_blank" rel="noopener noreferrer" className="font-mono bg-background px-1 rounded underline-offset-2 hover:underline">spscolumbia.campusgroups.com</a></li>
                      <li>Click <strong>Calendar</strong> in the top nav</li>
                      <li>Click <strong>Subscribe to Calendars</strong> → switch to the <strong>ICS Feeds</strong> tab</li>
                      <li>Copy your <strong>personal feed URL</strong></li>
                    </ol>
                  </div>

                  <form onSubmit={handleSpsPreview} className="space-y-3">
                    <div className="space-y-2">
                      <Label>Your ICS feed URL</Label>
                      <Input
                        type="password"
                        placeholder="https://spscolumbia.campusgroups.com/ics?user_id=…&token=…"
                        value={spsIcsUrl}
                        onChange={(e) => { setSpsIcsUrl(e.target.value); setSpsEvents(null); }}
                        autoComplete="off"
                      />
                      <p className="text-xs text-muted-foreground">The URL contains a private token — it's hidden above and never stored on our servers.</p>
                    </div>
                    <Button type="submit" disabled={!spsIcsUrl || previewSpsIcs.isPending}>
                      {previewSpsIcs.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                      Preview upcoming events
                    </Button>
                  </form>

                  {spsEvents !== null && (
                    spsEvents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No events found in the next 14 days.</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <p className="text-sm font-medium">
                            {spsFunOnly
                              ? `${spsDisplayed.length} fun event${spsDisplayed.length !== 1 ? "s" : ""} (of ${spsEvents.length} total)`
                              : `${spsEvents.length} event${spsEvents.length !== 1 ? "s" : ""} found (next 14 days)`}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors font-medium ${spsFunOnly ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700" : "border-border text-foreground hover:bg-muted"}`}
                              onClick={() => {
                                const next = !spsFunOnly;
                                setSpsFunOnly(next);
                                if (next) {
                                  setSpsSelected(new Set(spsEvents.filter((ev) => isFunEvent(ev.title)).map((ev) => ev.uid)));
                                } else {
                                  setSpsSelected(new Set(spsEvents.map((ev) => ev.uid)));
                                }
                              }}
                            >
                              <PartyPopper className="w-3 h-3" />
                              Fun events only
                            </button>
                            <button
                              type="button"
                              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                              onClick={() =>
                                setSpsSelected(
                                  spsSelected.size === spsDisplayed.length
                                    ? new Set()
                                    : new Set(spsDisplayed.map((ev) => ev.uid)),
                                )
                              }
                            >
                              {spsSelected.size === spsDisplayed.length ? "Deselect all" : "Select all"}
                            </button>
                          </div>
                        </div>

                        {spsDisplayed.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No fun events detected — try turning off the filter to see all events.
                          </p>
                        ) : (
                          <div className="max-h-60 overflow-y-auto space-y-1 rounded-lg border p-2 bg-muted/20">
                            {spsDisplayed.map((ev) => {
                              const start = new Date(ev.startIso);
                              const end = new Date(ev.endIso);
                              const dateStr = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
                              const startTime = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
                              const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
                              const checked = spsSelected.has(ev.uid);
                              return (
                                <label
                                  key={ev.uid}
                                  className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${checked ? "bg-primary/10" : "hover:bg-muted"}`}
                                >
                                  <input
                                    type="checkbox"
                                    className="mt-0.5 shrink-0"
                                    checked={checked}
                                    onChange={() => {
                                      const next = new Set(spsSelected);
                                      if (checked) next.delete(ev.uid); else next.add(ev.uid);
                                      setSpsSelected(next);
                                    }}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium leading-snug">{ev.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {dateStr} · {startTime}–{endTime}
                                      {ev.location ? ` · ${ev.location}` : ""}
                                    </p>
                                  </div>
                                  {ev.url && (
                                    <a href={ev.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        )}
                        <Button
                          className="w-full sm:w-auto"
                          disabled={spsSelected.size === 0 || importSpsEvents.isPending}
                          onClick={handleSpsImport}
                        >
                          {importSpsEvents.isPending
                            ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            : <CheckCircle2 className="w-4 h-4 mr-2" />}
                          Add {spsSelected.size} event{spsSelected.size !== 1 ? "s" : ""} to schedule
                        </Button>
                      </div>
                    )
                  )}
                  </div>
                )}

                {openPanel === "classroom" && (
                  <div className="space-y-3">
                  {isLoadingStatus ? (
                    <Skeleton className="h-16 w-full" />
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        {status?.classroomConnected
                          ? "Pulls published coursework with upcoming due dates from all your classes."
                          : "You'll be asked to allow Classroom access on your Google account."}
                      </p>
                      <Button onClick={() => handleImportClassroom()} disabled={importClassroom.isPending}>
                        {importClassroom.isPending
                          ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          : <RefreshCw className="w-4 h-4 mr-2" />}
                        {status?.classroomConnected ? "Import coursework" : "Connect & import"}
                      </Button>
                    </>
                  )}
                  </div>
                )}

                {openPanel === "schoology" && (
                  <div className="space-y-4">
                  {isLoadingStatus ? (
                    <Skeleton className="h-24 w-full" />
                  ) : status?.schoologyConnected ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Connected to <span className="font-medium text-foreground">{status.schoologyDomain}</span>
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Button onClick={handleImportSchoology} disabled={importSchoology.isPending}>
                          {importSchoology.isPending
                            ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            : <RefreshCw className="w-4 h-4 mr-2" />}
                          Import assignments
                        </Button>
                        <Button variant="outline" onClick={handleDisconnectSchoology} disabled={disconnectSchoology.isPending}>
                          Disconnect
                        </Button>
                      </div>
                    </>
                  ) : (
                    <form onSubmit={handleConnectSchoology} className="space-y-4">
                      <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
                        <p className="text-xs font-medium">How to get your API credentials:</p>
                        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                          <li>Sign in to your school's Schoology site</li>
                          <li>Click your name (top-right) → <strong>Settings</strong></li>
                          <li>Go to the <strong>API Access</strong> tab</li>
                          <li>Your <strong>Consumer Key</strong> and <strong>Consumer Secret</strong> are listed there</li>
                        </ol>
                      </div>
                      <div className="space-y-2">
                        <Label>Schoology Domain</Label>
                        <Input
                          placeholder="api.schoology.com"
                          value={schoologyDomain}
                          onChange={(e) => setSchoologyDomain(e.target.value)}
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Most schools use <span className="font-mono">api.schoology.com</span>. Enterprise schools may have a custom domain like <span className="font-mono">lms.yourschool.edu</span>
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Consumer Key</Label>
                        <Input
                          placeholder="Paste your Schoology consumer key"
                          value={schoologyKey}
                          onChange={(e) => setSchoologyKey(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Consumer Secret</Label>
                        <Input
                          type="password"
                          placeholder="Paste your Schoology consumer secret"
                          value={schoologySecret}
                          onChange={(e) => setSchoologySecret(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={connectSchoology.isPending}>
                        {connectSchoology.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Connect Schoology
                      </Button>
                    </form>
                  )}
                  </div>
                )}
              </div>
            </Card>
          )}

          {openPanel === "focusguard" && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <FocusGuardCard />
            </div>
          )}
        </section>

      </div>
    </Layout>
  );
}
