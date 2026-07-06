import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useListSchedules, useListCommitments, getListSchedulesQueryKey, getListCommitmentsQueryKey } from "@workspace/api-client-react";
import { useDeviceId } from "@/hooks/use-device-id";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, ArrowRight, Sparkles, CheckSquare } from "lucide-react";
import { format } from "date-fns";

export default function Home() {
  const deviceId = useDeviceId();
  const [, setLocation] = useLocation();

  const { data: schedules, isLoading: isLoadingSchedules } = useListSchedules(
    { deviceId: deviceId || "" },
    { query: { enabled: !!deviceId, queryKey: getListSchedulesQueryKey({ deviceId: deviceId || "" }) } }
  );

  const { data: commitments, isLoading: isLoadingCommitments } = useListCommitments(
    { deviceId: deviceId || "" },
    { query: { enabled: !!deviceId, queryKey: getListCommitmentsQueryKey({ deviceId: deviceId || "" }) } }
  );

  useEffect(() => {
    if (!isLoadingSchedules && !isLoadingCommitments) {
      if (schedules && schedules.length > 0) {
        // Find most recent active/complete schedule
        const completeSchedules = schedules.filter(s => s.status === "complete");
        if (completeSchedules.length > 0) {
          // They have a schedule, maybe navigate to it or just show summary here
        }
      } else if (commitments && commitments.length === 0) {
        setLocation("/onboarding");
      }
    }
  }, [schedules, commitments, isLoadingSchedules, isLoadingCommitments, setLocation]);

  if (!deviceId || isLoadingSchedules || isLoadingCommitments) {
    return (
      <Layout>
        <div className="space-y-6 pt-12">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  const completeSchedules = schedules?.filter(s => s.status === "complete") || [];
  const recentSchedule = completeSchedules.length > 0 ? completeSchedules[0] : null;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8 pt-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-heading font-semibold tracking-tight text-foreground">
            Good morning.
          </h1>
          <p className="text-muted-foreground text-lg">
            Let's get organized for the day.
          </p>
        </header>

        {recentSchedule ? (
          <div className="space-y-8">
            <div className="bg-card border rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 text-primary mb-4">
                  <CalendarDays className="w-6 h-6" />
                  <h2 className="text-xl font-medium">Your Active Schedule</h2>
                </div>
                
                <div className="space-y-2 mb-8">
                  <p className="text-muted-foreground">
                    Generated on {format(new Date(recentSchedule.createdAt), "MMMM d, yyyy")}
                  </p>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
                    {recentSchedule.scope === "week" ? "Weekly Plan" : "Daily Plan"}
                  </div>
                </div>

                <Button asChild size="lg" className="w-full sm:w-auto shadow-sm">
                  <Link href={`/schedule/${recentSchedule.id}`}>
                    View Schedule <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-6 rounded-2xl bg-secondary/50 border border-secondary text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center mx-auto text-primary shadow-sm">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="font-medium">Need a fresh start?</h3>
                <p className="text-sm text-muted-foreground">Generate a new plan for the upcoming week.</p>
                <Button asChild variant="outline" className="w-full mt-2 bg-background">
                  <Link href="/generate">Create New Plan</Link>
                </Button>
              </div>
              
              <div className="p-6 rounded-2xl bg-secondary/50 border border-secondary text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center mx-auto text-muted-foreground shadow-sm">
                  <CheckSquare className="w-6 h-6" />
                </div>
                <h3 className="font-medium">Changes to your routine?</h3>
                <p className="text-sm text-muted-foreground">Update your classes and commitments.</p>
                <Button asChild variant="outline" className="w-full mt-2 bg-background">
                  <Link href="/commitments">Manage Commitments</Link>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card border rounded-2xl p-8 md:p-12 text-center shadow-sm max-w-xl mx-auto space-y-6">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-heading font-semibold">Ready to plan?</h2>
            <p className="text-muted-foreground mb-8 text-lg">
              You have {commitments?.length || 0} commitments saved. Let the AI build a realistic, balanced schedule for you.
            </p>
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/generate">
                Generate Schedule
              </Link>
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
