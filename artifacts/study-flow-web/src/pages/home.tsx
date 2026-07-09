import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useDeviceId } from "@/hooks/use-device-id";
import {
  useListSchedules,
  useDeleteSchedule,
  getListSchedulesQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Calendar, PlusCircle, ArrowRight, Sparkles, Trash2, CalendarDays, Loader2, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function Home() {
  const deviceId = useDeviceId();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="space-y-2">
          <h1 className="text-3xl font-heading font-bold text-foreground">
            {activeSchedule ? "Today" : "Welcome to Tempus"}
          </h1>
          <p className="text-muted-foreground text-lg">Your AI-powered study planner.</p>
        </header>

        {activeSchedule ? (
          <div className="space-y-6">
            <Card className="border-primary/20 bg-primary/5 shadow-sm overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-primary/20 transition-colors" />
              <CardContent className="relative z-10 pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    className="flex-1 text-lg py-6 rounded-xl shadow-sm"
                    onClick={() => setLocation(`/schedule/${activeSchedule.id}`)}
                  >
                    Open <ArrowRight className="ml-2 w-6 h-6" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 py-6 rounded-xl bg-background hover:bg-secondary/50"
                    onClick={() => setLocation("/create")}
                  >
                    <PlusCircle className="mr-2 w-5 h-5" /> New
                  </Button>
                </div>
              </CardContent>
            </Card>
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
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-heading font-semibold text-foreground">Current plans</h2>
              <span className="text-sm text-muted-foreground">
                {currentPlans.length} {currentPlans.length === 1 ? "plan" : "plans"}
              </span>
            </div>
            <div className="space-y-3">
              {currentPlans.map((plan) => {
                const isDeleting = deleteSchedule.isPending && pendingDeleteId === plan.id;
                return (
                  <Card key={plan.id} className="group hover:border-primary/40 transition-colors">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <CalendarDays className="w-5 h-5" />
                      </div>
                      <button
                        className="flex-1 min-w-0 text-left cursor-pointer"
                        onClick={() => setLocation(`/schedule/${plan.id}`)}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground">
                            {plan.scope === "week" ? "Weekly plan" : "Daily plan"}
                          </span>
                          {plan.status !== "complete" && (
                            <Badge variant="outline" className="text-xs">Needs details</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          Created {format(new Date(plan.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground shrink-0"
                            aria-label="Plan details"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="w-5 h-5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-64 text-sm space-y-2 p-4">
                          <p className="font-medium">{plan.scope === "week" ? "Weekly plan" : "Daily plan"}</p>
                          <div className="text-muted-foreground space-y-1 text-xs">
                            <p>Created {format(new Date(plan.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
                            <p>Status: {plan.status === "complete" ? "Ready" : "Needs details"}</p>
                            <p className="font-mono text-[10px] break-all text-muted-foreground/60">{plan.id}</p>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        aria-label="Delete plan"
                        disabled={isDeleting}
                        onClick={() => setPendingDeleteId(plan.id)}
                      >
                        {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                      </Button>
                    </CardContent>
                  </Card>
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
