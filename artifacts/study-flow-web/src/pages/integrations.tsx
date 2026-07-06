import { useEffect, useRef, useState } from "react";
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [canvasUrl, setCanvasUrl] = useState("");
  const [canvasToken, setCanvasToken] = useState("");
  const autoImportTriggered = useRef(false);

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

        {/* Imported assignments */}
        <section className="space-y-3">
          <h2 className="font-semibold text-xl flex items-center gap-2">
            Imported Assignments
            {assignments.length > 0 && <Badge variant="secondary">{assignments.length}</Badge>}
          </h2>
          {isLoadingAssignments ? (
            <Skeleton className="h-20 w-full" />
          ) : assignments.length === 0 ? (
            <p className="text-muted-foreground">
              Nothing imported yet. Connect a tool above and import your assignments — they'll show up here and in the
              New Plan flow.
            </p>
          ) : (
            <div className="space-y-3">
              {assignments.map((a) => (
                <div key={a.id} className="bg-card border rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
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
                    {a.url && (
                      <a href={a.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="text-muted-foreground">
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
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
