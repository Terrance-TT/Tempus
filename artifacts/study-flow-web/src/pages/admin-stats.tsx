import { Loader2, Users, Repeat, Timer, CalendarCheck, Bot, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { useGetAdminStatus, getGetAdminStatusQueryKey, useGetAdminStats, getGetAdminStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import evalData from "@/data/gpt5-mini-eval.json";

function StatCard({
  icon: Icon,
  label,
  value,
  testId,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="pt-6 space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="w-4 h-4" />
          <span className="text-sm">{label}</span>
        </div>
        <p className="text-3xl font-heading font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

type EvalResult = {
  name: string;
  scope: string;
  status?: string;
  questions?: string[];
  blockCount?: number;
  distinctDays?: number;
  overlaps?: string[];
  missingCommitments?: string[];
  tasksRequested?: number;
  tasksScheduled?: number;
  durationMs?: number;
  promptTokens?: number | null;
  completionTokens?: number | null;
  sampleBlocks?: Array<{ day: string; startTime: string; endTime: string; title: string; category: string }>;
  error?: string;
};

function EvalResultCard({ result, index }: { result: EvalResult; index: number }) {
  const isComplete = result.status === "complete";
  const isClarify = result.status === "needs_clarification";
  const hasOverlaps = (result.overlaps?.length ?? 0) > 0;

  return (
    <Card data-testid={`eval-result-${index}`}>
      <CardContent className="pt-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {result.error ? (
            <Badge variant="destructive">error</Badge>
          ) : isComplete ? (
            <Badge className="bg-primary/15 text-primary hover:bg-primary/15 border-transparent">
              <CheckCircle2 className="w-3 h-3 mr-1" /> complete
            </Badge>
          ) : (
            <Badge variant="secondary">
              <HelpCircle className="w-3 h-3 mr-1" /> asked for clarification
            </Badge>
          )}
          <Badge variant="outline">{result.scope}</Badge>
          {result.durationMs != null && <Badge variant="outline">{(result.durationMs / 1000).toFixed(1)}s</Badge>}
        </div>
        <p className="font-semibold">{result.name}</p>

        {result.error ? (
          <p className="text-sm text-destructive">{result.error}</p>
        ) : isComplete ? (
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-muted-foreground">
              <span>{result.blockCount} blocks</span>
              <span>{result.distinctDays}/7 days covered</span>
              <span className={hasOverlaps ? "text-destructive font-medium" : ""}>
                {result.overlaps?.length ?? 0} overlaps
              </span>
              <span>
                tasks scheduled: {result.tasksScheduled}/{result.tasksRequested}
              </span>
              {result.promptTokens != null && (
                <span>
                  {result.promptTokens} in / {result.completionTokens} out tokens
                </span>
              )}
            </div>
            {hasOverlaps && (
              <div className="flex items-start gap-2 text-destructive">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{result.overlaps!.join("; ")}</span>
              </div>
            )}
            {result.sampleBlocks && result.sampleBlocks.length > 0 && (
              <div className="rounded-lg border bg-secondary/20 p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sample blocks</p>
                {result.sampleBlocks.map((b, i) => (
                  <p key={i} className="text-xs font-mono">
                    {b.day} {b.startTime}–{b.endTime} · {b.title} <span className="text-muted-foreground">({b.category})</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : isClarify ? (
          <div className="rounded-lg border bg-secondary/20 p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Questions it asked</p>
            {result.questions?.map((q, i) => (
              <p key={i} className="text-sm">• {q}</p>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Gpt5MiniTab() {
  const results = (evalData.results ?? []) as EvalResult[];
  const completed = results.filter((r) => r.status === "complete");
  const overlapsTotal = completed.reduce((n, r) => n + (r.overlaps?.length ?? 0), 0);
  const avgSeconds =
    results.filter((r) => r.durationMs != null).reduce((n, r) => n + (r.durationMs ?? 0), 0) /
    Math.max(1, results.filter((r) => r.durationMs != null).length) /
    1000;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Bot} label="Test runs" value={String(results.length)} testId="eval-stat-runs" />
        <StatCard icon={CheckCircle2} label="Completed schedules" value={`${completed.length}/${results.length}`} testId="eval-stat-completed" />
        <StatCard icon={AlertTriangle} label="Overlap violations" value={String(overlapsTotal)} testId="eval-stat-overlaps" />
        <StatCard icon={Timer} label="Avg. response time" value={`${avgSeconds.toFixed(1)}s`} testId="eval-stat-avg-time" />
      </div>
      <p className="text-sm text-muted-foreground">
        Model: <span className="font-mono">{evalData.model}</span> · ran {new Date(evalData.ranAt).toLocaleString()}
      </p>
      <div className="grid gap-4">
        {results.map((r, i) => (
          <EvalResultCard key={i} result={r} index={i} />
        ))}
      </div>
    </div>
  );
}

export default function AdminStats() {
  const { data: adminStatus, isLoading: isLoadingStatus } = useGetAdminStatus({
    query: { queryKey: getGetAdminStatusQueryKey() },
  });
  const isAdmin = adminStatus?.isAdmin === true;

  const { data: stats, isLoading } = useGetAdminStats({
    query: { enabled: isAdmin, queryKey: getGetAdminStatsQueryKey() },
  });

  if (isLoadingStatus) {
    return (
      <>
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <div className="text-center py-20 space-y-2">
          <p className="text-xl font-heading font-semibold">Admins only</p>
          <p className="text-muted-foreground text-sm">This page is reserved for the Tempus team.</p>
        </div>
      </>
    );
  }

  const avgSeconds =
    stats?.averageGenerationTimeMs != null
      ? (stats.averageGenerationTimeMs / 1000).toFixed(1)
      : null;

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" />
            Stats
          </h1>
          <p className="text-muted-foreground mt-1">
            High-level usage numbers across all Tempus users.
          </p>
        </div>

        <Tabs defaultValue="overview">
          <TabsList data-testid="tabs-admin-stats">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="gpt5mini" data-testid="tab-gpt5mini">GPT 5 Mini</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={Users}
                  label="Total users"
                  value={stats ? stats.totalUsers.toLocaleString() : "—"}
                  testId="stat-total-users"
                />
                <StatCard
                  icon={Repeat}
                  label="Returning users"
                  value={stats ? stats.returningUsers.toLocaleString() : "—"}
                  testId="stat-returning-users"
                />
                <StatCard
                  icon={CalendarCheck}
                  label="Schedules generated"
                  value={stats ? stats.totalSchedulesGenerated.toLocaleString() : "—"}
                  testId="stat-schedules-generated"
                />
                <StatCard
                  icon={Timer}
                  label="Avg. generation time"
                  value={avgSeconds != null ? `${avgSeconds}s` : "No data yet"}
                  testId="stat-avg-generation-time"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="gpt5mini" className="mt-4">
            <Gpt5MiniTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
