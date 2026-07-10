import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useDeviceId } from "@/hooks/use-device-id";
import {
  useListSchedules,
  useDeleteSchedule,
  useGetSchedule,
  useUpdateSchedule,
  getListSchedulesQueryKey,
  getGetScheduleQueryKey,
  type ScheduleBlockInput,
  type DayOfWeek,
} from "@workspace/api-client-react";
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
import { PlusCircle, Sparkles, Loader2, Plus, Pencil, Trash2, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function Home() {
  const deviceId = useDeviceId();
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  // FIX: Track whether Escape was pressed so onBlur doesn't re-submit
  const escapePressedRef = useRef(false);

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

  // FIX: Only submit rename if the name actually changed
  const submitRename = (id: string, originalName: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenamingId(null);
      return;
    }
    if (trimmed === originalName) {
      // Name unchanged — just cancel rename mode without API call
      setRenamingId(null);
      return;
    }
    renameSchedule.mutate({ id, name: trimmed });
  };

  const startRename = (plan: { id: string; name?: string | null; scope: string }) => {
    const displayName = plan.name ?? (plan.scope === "week" ? "Weekly plan" : "Daily plan");
    setRenamingId(plan.id);
    setRenameValue(displayName);
    escapePressedRef.current = false;
    setTimeout(() => renameInputRef.current?.select(), 0);
  };

  const activeSchedule = schedules?.find(s => s.status === "complete");
  const currentPlans = schedules ?? [];

  const { data: activeScheduleDetail } = useGetSchedule(
    activeSchedule?.id || "",
    { deviceId: deviceId || "" },
    { query: { enabled: !!activeSchedule?.id && !!deviceId, queryKey: getGetScheduleQueryKey(activeSchedule?.id || "", { deviceId: deviceId || "" }) } }
  );

  const addPickupGame = useUpdateSchedule({
    mutation: {
      onSuccess: (data, variables) => {
        queryClient.setQueryData(getGetScheduleQueryKey(variables.id, { deviceId: deviceId || "" }), data);
        queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey({ deviceId: deviceId || "" }) });
        toast({ title: "Pickup Games added! ⚽", description: "Today, 7:00pm at Lerner Hall Field." });
      },
      onError: (err: any) => {
        toast({ title: "Couldn't add it", description: err?.message || "Please try again.", variant: "destructive" });
      },
    },
  });

  const handleAddPickupGame = () => {
    if (!activeSchedule || !activeScheduleDetail || !deviceId) return;
    const jsDayToKey: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const today = jsDayToKey[new Date().getDay()];
    const existingBlocks: ScheduleBlockInput[] = activeScheduleDetail.blocks.map(b => ({
      id: b.id,
      day: b.day,
      startTime: b.startTime,
      endTime: b.endTime,
      title: b.title,
      category: b.category,
      notes: b.notes,
    }));
    const pickupGameBlock: ScheduleBlockInput = {
      day: today,
      startTime: "19:00",
      endTime: "20:00",
      title: "Pickup Games — Soccer",
      category: "extracurricular",
      notes: "Lerner Hall Field",
    };
    addPickupGame.mutate({
      id: activeSchedule.id,
      data: { deviceId, blocks: [...existingBlocks, pickupGameBlock] },
    });
  };

  // FIX: Show "Plans" heading when on /plans route
  const isPlansPage = location === "/plans";
  const pageTitle = isPlansPage ? "Plans" : activeSchedule ? "Today" : "Welcome to Tempus";

  const confirmDelete = () => {
    if (!pendingDeleteId || !deviceId) return;
    deleteSchedule.mutate({ id: pendingDeleteId, params: { deviceId } });
  };

  if (!deviceId || isLoading) {
    return (
      <>
        <div className="space-y-6 pt-12">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-14 w-full rounded-full" />
          <Skeleton className="h-14 w-full rounded-full" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="max-w-3xl mx-auto space-y-10 pt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="space-y-1">
          <h1 className="text-4xl font-heading font-bold text-foreground tracking-tight">
            {pageTitle}
          </h1>
          <p className="text-muted-foreground text-lg">Your AI-powered study planner.</p>
        </header>

        {activeSchedule && !isPlansPage && (
          <button
            onClick={handleAddPickupGame}
            disabled={!activeScheduleDetail || addPickupGame.isPending}
            data-testid="button-add-pickup-games"
            className="group relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-green-500 to-lime-500 p-6 text-left shadow-lg shadow-emerald-500/30 transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <div className="absolute -right-6 -top-6 text-8xl opacity-20 rotate-12 select-none">⚽</div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl shrink-0">
                ⚽
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-white/80">Quick add</p>
                <h3 className="text-2xl font-heading font-extrabold text-white leading-tight">Pickup Games</h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-white/90">
                  <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Today, 7:00pm</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Lerner Hall Field</span>
                </div>
              </div>
              <div className="shrink-0">
                {addPickupGame.isPending ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white text-emerald-700 font-bold text-sm px-4 py-2 shadow-sm transition-transform group-hover:scale-105">
                    <Plus className="w-4 h-4" /> Add to schedule
                  </span>
                )}
              </div>
            </div>
          </button>
        )}

        {activeSchedule && !isPlansPage ? (
          <div>
            <button
              className="group aspect-[2/1] w-1/2 rounded-2xl bg-card flex items-center justify-center transition-all duration-200 hover:shadow-sm"
              onClick={() => setLocation("/create")}
              aria-label="New plan"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center transition-colors duration-200 group-hover:bg-primary/20">
                <Plus className="w-7 h-7 text-primary" />
              </div>
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
                      <div className="w-3 h-9 rounded-full bg-primary/60 self-center shrink-0 ml-2 translate-x-1 origin-bottom transition-transform duration-1000 ease-out group-hover:translate-x-3 group-hover:rotate-[18deg]" />

                      <button
                        className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 -ml-2 -mr-4 transition-transform duration-1000 ease-out group-hover:translate-x-1"
                        onClick={() => !isRenaming && setLocation(`/schedule/${plan.id}`)}
                        aria-label="Open plan"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/40" />
                      </button>

                      {isRenaming ? (
                        <div className="w-48 h-full flex items-center pr-2">
                          <input
                            ref={renameInputRef}
                            autoFocus
                            className="bg-transparent text-lg font-bold text-foreground outline-none w-full"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                submitRename(plan.id, displayName);
                              }
                              if (e.key === "Escape") {
                                escapePressedRef.current = true;
                                setRenamingId(null);
                              }
                            }}
                            onBlur={() => {
                              // FIX: Don't submit if Escape was just pressed
                              if (escapePressedRef.current) {
                                escapePressedRef.current = false;
                                return;
                              }
                              submitRename(plan.id, displayName);
                            }}
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

                      <div className="relative w-16 h-16 flex items-center justify-center shrink-0 -ml-4 -mr-2">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-1000 ease-out group-hover:-translate-x-1">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary/50">
                            {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="absolute top-1/2 left-1/2 -translate-y-1/2 translate-x-[calc(-50%+6px)] w-4 h-9 rounded-full flex items-center justify-center gap-0.5 bg-transparent transition-transform duration-1000 ease-out group-hover:-rotate-45"
                              onClick={(e) => e.stopPropagation()}
                              aria-label="Plan options"
                            >
                              <span className="w-3 h-9 rounded-full bg-primary/60" />
                              <span className="w-3 h-9 rounded-full bg-primary/60" />
                            </button>
                          </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => startRename(plan)}>
                            <Pencil className="w-4 h-4 mr-2" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setPendingDeleteId(plan.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="flex items-center gap-2 font-normal text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {format(new Date(plan.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </DropdownMenuLabel>
                        </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
    </>
  );
}
