import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useDeviceId } from "@/hooks/use-device-id";
import {
  useListSchedules,
  useDeleteSchedule,
  getListSchedulesQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Sparkles, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const deviceId = useDeviceId();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const { data: schedules, isLoading } = useListSchedules(
    { deviceId: deviceId || "" },
    { query: { enabled: !!deviceId, queryKey: getListSchedulesQueryKey({ deviceId: deviceId || "" }) } }
  );

  const deleteSchedule = useDeleteSchedule({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey({ deviceId: deviceId || "" }) });
        toast({ title: "Plan deleted", description: "The plan has been removed." });
      },
      onError: (err: any) => {
        toast({ title: "Couldn't delete plan", description: err?.message || "Please try again.", variant: "destructive" });
      },
      onSettled: () => setPendingDeleteId(null),
    },
  });

  const renameSchedule = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`/api/schedules/${id}/name`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, deviceId }),
      });
      if (!res.ok) throw new Error("Failed to rename");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey({ deviceId: deviceId || "" }) });
    },
    onError: () => {
      toast({ title: "Couldn't rename", description: "Please try again.", variant: "destructive" });
    },
    onSettled: () => setRenamingId(null),
  });

  const submitRename = (id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) {
      renameSchedule.mutate({ id, name: trimmed });
    } else {
      setRenamingId(null);
    }
  };

  const startRename = (plan: { id: string; name?: string | null; scope: string }) => {
    const displayName = plan.name ?? (plan.scope === "week" ? "Weekly plan" : "Daily plan");
    setRenamingId(plan.id);
    setRenameValue(displayName);
    setTimeout(() => renameInputRef.current?.select(), 0);
  };

  const activeSchedule = schedules?.find(s => s.status === "complete");
  const currentPlans = schedules ?? [];

  const confirmDelete = () => {
    if (!pendingDeleteId || !deviceId) return;
    deleteSchedule.mutate({ id: pendingDeleteId, params: { deviceId } });
  };

  if (!deviceId || isLoading) {
    return (
      <Layout>
        <div className="space-y-6 pt-12">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-14 w-full rounded-full" />
          <Skeleton className="h-14 w-full rounded-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-10 pt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="space-y-1">
          <h1 className="text-4xl font-heading font-bold text-foreground tracking-tight">
            {activeSchedule ? "Today" : "Welcome to Tempus"}
          </h1>
          <p className="text-muted-foreground text-lg">Your AI-powered study planner.</p>
        </header>

        {activeSchedule ? (
          <div>
            <button
              className="aspect-[2/1] w-1/2 rounded-2xl border bg-card flex items-center justify-center transition-all duration-200 hover:border-primary/40 hover:shadow-sm"
              onClick={() => setLocation("/create")}
            >
              <span className="text-xl font-bold text-foreground">New</span>
            </button>
          </div>
        ) : currentPlans.length === 0 ? (
          <Card className="text-center py-16 px-6 border-dashed bg-secondary/10 shadow-none relative overflow-hidden rounded-3xl">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <div className="relative z-10 space-y-6 max-w-md mx-auto">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary shadow-sm border border-primary/20">
                <Sparkles className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-heading font-semibold text-foreground">Ready to get organized?</h2>
                <p className="text-muted-foreground text-lg">
                  Snap a photo of your class timetable, tell us what's due, and we'll build a balanced schedule for you in seconds.
                </p>
              </div>
              <Button size="lg" className="w-full text-lg py-6 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform" onClick={() => setLocation("/create")}>
                <PlusCircle className="mr-2 w-5 h-5" /> Create Your First Plan
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="border-dashed bg-secondary/10 shadow-none rounded-2xl">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <p className="text-muted-foreground">
                  No finished plan yet — pick up one of your plans below or start a new one.
                </p>
              </div>
              <Button className="rounded-xl shrink-0" onClick={() => setLocation("/create")}>
                <PlusCircle className="mr-2 w-4 h-4" /> New Plan
              </Button>
            </CardContent>
          </Card>
        )}

        {currentPlans.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-heading font-semibold text-foreground">Current plans</h2>
              <span className="text-sm text-muted-foreground">
                {currentPlans.length} {currentPlans.length === 1 ? "plan" : "plans"}
              </span>
            </div>

            <div className="space-y-2">
              {currentPlans.map((plan) => {
                const isDeleting = deleteSchedule.isPending && pendingDeleteId === plan.id;
                const isRenaming = renamingId === plan.id;
                const displayName = plan.name ?? (plan.scope === "week" ? "Weekly plan" : "Daily plan");

                return (
                  <div key={plan.id} className="group relative">
                    <div
                      className={cn(
                        "h-16 rounded-full border bg-card inline-flex items-center transition-all duration-200",
                        "hover:border-primary/40 hover:shadow-sm"
                      )}
                    >
                      {/* Vertical pill to the left of the circle */}
                      <div className="w-3 h-9 rounded-full bg-primary/60 self-center shrink-0 ml-2" />

                      {/* Left circle cap — indicator dot, click to open */}
                      <button
                        className="w-16 h-16 rounded-full flex items-center justify-center shrink-0"
                        onClick={() => !isRenaming && setLocation(`/schedule/${plan.id}`)}
                        aria-label="Open plan"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/40" />
                      </button>

                      {/* Rolling name — expands out from the left circle on hover */}
                      {isRenaming ? (
                        <div className="w-48 h-full flex items-center pr-2">
                          <input
                            ref={renameInputRef}
                            autoFocus
                            className="bg-transparent text-lg font-bold text-foreground outline-none w-full"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") submitRename(plan.id);
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                            onBlur={() => submitRename(plan.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      ) : (
                        <div
                          className="overflow-hidden max-w-0 group-hover:max-w-xs transition-all duration-1000 ease-out h-full flex items-center cursor-pointer select-none"
                          onClick={() => setLocation(`/schedule/${plan.id}`)}
                          onDoubleClick={(e) => { e.preventDefault(); startRename(plan); }}
                        >
                          <span className="pr-4 text-lg font-bold text-foreground whitespace-nowrap">
                            {displayName}
                          </span>
                        </div>
                      )}

                      {/* Right circle cap — delete */}
                      <button
                        className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary/50 hover:bg-destructive/15 hover:text-destructive transition-colors duration-200"
                        onClick={(e) => { e.stopPropagation(); setPendingDeleteId(plan.id); }}
                        disabled={isDeleting}
                        aria-label="Delete plan"
                      >
                        {isDeleting
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove the plan and any calendar events it created. This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={confirmDelete}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
