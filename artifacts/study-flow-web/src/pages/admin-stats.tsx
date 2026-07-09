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

type EvalBlock = {
  day: string;
  startTime: string;
  endTime: string;
  title: string;
  category: string;
  notes?: string | null;
};

type EvalPrompt = {
  scope?: string;
  commitments?: Array<{ title: string; type: string; daysOfWeek: string[]; startTime: string; endTime: string }>;
  tasks?: Array<{ title: string; dueDate?: string; estimatedMinutes?: number; notes?: string | null }>;
  priorAnswers?: Array<{ question: string; answer: string }>;
};

type EvalResult = {
  name: string;
  scope: string;
  status?: string;
  questions?: string[];
  blockCount?: number;
  distinctDays?: number;
  overlaps?: string[];
  tasksRequested?: number;
  tasksScheduled?: number;
  durationMs?: number;
  promptTokens?: number | null;
  completionTokens?: number | null;
  userPrompt?: EvalPrompt;
  blocks?: EvalBlock[];
  error?: string;
};

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABELS: Record<string, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

function getCategoryColor(category: string) {
  switch (category) {
    case "class": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800/50";
    case "homework": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800/50";
    case "extracurricular": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800/50";
    case "routine": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800/50";
    case "break": return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800/50";
    case "free": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
    default: return "bg-secondary text-secondary-foreground border-border";
  }
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function MiniWeekGrid({ blocks }: { blocks: EvalBlock[] }) {
  const days = DAY_ORDER.filter((d) => blocks.some((b) => b.day === d));
  if (days.length === 0) return null;

  const startMin = Math.max(0, Math.min(...blocks.map((b) => toMinutes(b.startTime))) - 30);
  const endMin = Math.min(24 * 60, Math.max(...blocks.map((b) => toMinutes(b.endTime))) + 30);
  const span = Math.max(1, endMin - startMin);
  const gridHeight = Math.max(420, Math.round(span * 0.55));

  const hourMarks: number[] = [];
  for (let m = Math.ceil(startMin / 120) * 120; m < endMin; m += 120) hourMarks.push(m);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <div className="min-w-[560px]">
        <div
          className="grid border-b bg-secondary/30"
          style={{ gridTemplateColumns: `3rem repeat(${days.length}, 1fr)` }}
        >
          <div />
          {days.map((d) => (
            <div key={d} className="px-2 py-1.5 text-xs font-medium text-center border-l">
              {DAY_LABELS[d]}
            </div>
          ))}
        </div>
        <div
          className="grid relative"
          style={{ gridTemplateColumns: `3rem repeat(${days.length}, 1fr)`, height: gridHeight }}
        >
          <div className="relative">
            {hourMarks.map((m) => (
              <span
                key={m}
                className="absolute right-1 -translate-y-1/2 text-[10px] text-muted-foreground"
                style={{ top: `${((m - startMin) / span) * 100}%` }}
              >
                {Math.floor(m / 60)}:00
              </span>
            ))}
          </div>
          {days.map((d) => (
            <div key={d} className="relative border-l">
              {hourMarks.map((m) => (
                <div
                  key={m}
                  className="absolute left-0 right-0 border-t border-dashed border-border/60"
                  style={{ top: `${((m - startMin) / span) * 100}%` }}
                />
              ))}
              {blocks
                .filter((b) => b.day === d)
                .map((b, i) => {
                  const top = ((toMinutes(b.startTime) - startMin) / span) * 100;
                  const height = ((toMinutes(b.endTime) - toMinutes(b.startTime)) / span) * 100;
                  return (
                    <div
                      key={i}
                      className={`absolute left-0.5 right-0.5 rounded border px-1 py-0.5 overflow-hidden ${getCategoryColor(b.category)}`}
                      style={{ top: `${top}%`, height: `calc(${height}% - 2px)` }}
                      title={`${b.title} (${b.startTime}–${b.endTime})`}
                    >
                      <p className="text-[10px] font-medium leading-tight truncate">{b.title}</p>
                      {height > 4 && (
                        <p className="text-[9px] opacity-70 leading-tight truncate">
                          {b.startTime}–{b.endTime}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UserPromptSummary({ prompt }: { prompt: EvalPrompt }) {
  return (
    <div className="rounded-lg border bg-secondary/20 p-3 space-y-2 text-sm">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">User prompt</p>
      {prompt.commitments && prompt.commitments.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-0.5">Commitments</p>
          {prompt.commitments.map((c, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              • {c.title} — {c.daysOfWeek.map((d) => DAY_LABELS[d] ?? d).join(", ")} {c.startTime}–{c.endTime} ({c.type})
            </p>
          ))}
        </div>
      )}
      {prompt.tasks && prompt.tasks.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-0.5">Tasks</p>
          {prompt.tasks.map((t, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              • {t.title}
              {t.dueDate ? ` — due ${t.dueDate}` : ""}
              {t.estimatedMinutes ? ` (~${t.estimatedMinutes} min)` : ""}
              {t.notes ? ` — "${t.notes}"` : ""}
            </p>
          ))}
        </div>
      )}
      {prompt.priorAnswers && prompt.priorAnswers.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-0.5">Preferences</p>
          {prompt.priorAnswers.map((a, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              • {a.question} {a.answer}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function EvalResultCard({ result, index }: { result: EvalResult; index: number }) {
  const isComplete = result.status === "complete";
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

        {result.userPrompt && <UserPromptSummary prompt={result.userPrompt} />}

        {result.error ? (
          <p className="text-sm text-destructive">{result.error}</p>
        ) : isComplete ? (
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-muted-foreground">
              <span>{result.blockCount} blocks</span>
              <span>{result.distinctDays}/{result.scope === "day" ? 1 : 7} days covered</span>
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
            {result.blocks && result.blocks.length > 0 && <MiniWeekGrid blocks={result.blocks} />}
          </div>
        ) : (
          <div className="rounded-lg border bg-secondary/20 p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Questions it asked</p>
            {result.questions?.map((q, i) => (
              <p key={i} className="text-sm">• {q}</p>
            ))}
          </div>
        )}
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
