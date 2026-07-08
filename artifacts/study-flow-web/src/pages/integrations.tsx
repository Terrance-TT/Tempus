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
  useListAssignments,
  getListAssignmentsQueryKey,
  useDeleteAssignment,
  useCreateExtensionToken,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
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
  ShieldCheck,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

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

  const [canvasUrl, setCanvasUrl] = useState("");
  const [canvasToken, setCanvasToken] = useState("");
  const autoImportTriggered = useRef(false);

  const [connectionCode, setConnectionCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const createExtensionToken = useCreateExtensionToken();

  const handleGenerateCode = () => {
    if (!deviceId) return;
    // First click fetches the existing code; clicking again rotates the
    // token so a leaked code can be invalidated.
    const rotate = connectionCode !== null;
    createExtensionToken.mutate(
      { data: { deviceId, rotate } },
      {
        onSuccess: ({ token }) => {
          const apiUrl = `${window.location.origin}/api`;
          setConnectionCode(btoa(JSON.stringify({ apiUrl, token })));
          setCodeCopied(false);
        },
        onError: () => {
          toast({
            title: "Couldn't generate code",
            description: "Please try again.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleCopyCode = async () => {
    if (!connectionCode) return;
    await navigator.clipboard.writeText(connectionCode);
    setCodeCopied(true);
    toast({ title: "Connection code copied" });
    setTimeout(() => setCodeCopied(false), 2500);
  };

  const { data: status, isLoading: isLoadingStatus } = useGetIntegrationsStatus(
    { deviceId: deviceId || "" },
    { query: { enabled: !!deviceId, queryKey: getGetIntegrationsStatusQueryKey({ deviceId: deviceId || "" }) } },
  );

  const { data: assignments = [], isLoading: isLoadingAssignments } = useListAssignments(
    { deviceId: deviceId || "" },
    { query: { enabled: !!deviceId, queryKey: getListAssignmentsQueryKey({ deviceId: deviceId || "" }) } },
  );

  const connectCanvas = useConnectCanvas();
  const disconnectCanvas = useDisconnectCanvas();
  const importCanvas = useImportCanvasAssignments();
  const importClassroom = useImportClassroomAssignments();
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
            description:
              err?.data?.message ?? "Google Classroom import failed. Please try again.",
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
                            {a.source === "canvas" ? "Canvas" : "Classroom"}
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

        <div className="grid gap-6 md:grid-cols-2">
          {/* Canvas LMS */}
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BookOpen className="w-5 h-5 text-primary" />
                Canvas LMS
                {status?.canvasConnected && (
                  <Badge variant="secondary" className="ml-auto flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {status?.canvasConnected
                  ? `Connected to ${status.canvasBaseUrl}`
                  : "Import upcoming assignments from your school's Canvas."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStatus ? (
                <Skeleton className="h-24 w-full" />
              ) : status?.canvasConnected ? (
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleImportCanvas} disabled={importCanvas.isPending}>
                    {importCanvas.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Import assignments
                  </Button>
                  <Button variant="outline" onClick={handleDisconnectCanvas} disabled={disconnectCanvas.isPending}>
                    Disconnect
                  </Button>
                </div>
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
                      Open Canvas in your browser and copy the first part of the address bar — it usually looks like https://schoolname.instructure.com or https://canvas.school.edu
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
                    <p className="text-xs text-muted-foreground">
                      In Canvas: Account → Settings → New Access Token
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={connectCanvas.isPending}>
                    {connectCanvas.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Connect Canvas
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Google Classroom */}
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <GraduationCap className="w-5 h-5 text-primary" />
                Google Classroom
                {status?.classroomConnected && (
                  <Badge variant="secondary" className="ml-auto flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Import upcoming coursework from your Google Classroom classes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStatus ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <div className="space-y-3">
                  <Button onClick={() => handleImportClassroom()} disabled={importClassroom.isPending} className="w-full sm:w-auto">
                    {importClassroom.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    {status?.classroomConnected ? "Import coursework" : "Connect & import"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {status?.classroomConnected
                      ? "Pulls published coursework with upcoming due dates."
                      : "You'll be asked to allow Classroom access on your Google account."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Focus Guard extension */}
        <Card className="border shadow-sm" data-testid="card-focus-guard">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Tempus Focus Guard
              <Badge variant="outline" className="ml-auto">Chrome extension</Badge>
            </CardTitle>
            <CardDescription>
              Automatically blocks YouTube, Instagram, Snapchat and other distracting sites
              during the work blocks on your schedule. Strict mode: there's no off switch —
              the only way out is removing the extension.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Download the extension and unzip it.</li>
              <li>
                In Chrome, open <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">chrome://extensions</span>,
                turn on <strong>Developer mode</strong>, click <strong>Load unpacked</strong> and pick the unzipped folder.
              </li>
              <li>Generate your connection code below and paste it into the extension popup.</li>
            </ol>
            <div className="flex flex-wrap gap-3">
              <a href={`${import.meta.env.BASE_URL}tempus-focus-guard.zip`} download>
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
                  Paste this into the Tempus Focus Guard popup in Chrome. Keep it private — it
                  lets the extension read your schedule. Regenerating invalidates the old code,
                  so a connected extension will ask for the new one.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Empty state when no assignments and not loading */}
        {!isLoadingAssignments && assignments.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Nothing imported yet. Connect a tool above and import your assignments — they'll show up here and in the New Plan flow.
          </p>
        )}
      </div>
    </Layout>
  );
}
