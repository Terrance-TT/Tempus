import { useLocation } from "wouter";
import { useDeviceId } from "@/hooks/use-device-id";
import { 
  useListSchedules, 
  getListSchedulesQueryKey,
  useDeleteSchedule
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { History as HistoryIcon, Calendar, ArrowRight, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function History() {
  const deviceId = useDeviceId();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: schedules, isLoading } = useListSchedules(
    { deviceId: deviceId || "" },
    { query: { enabled: !!deviceId, queryKey: getListSchedulesQueryKey({ deviceId: deviceId || "" }) } }
  );

  const deleteSchedule = useDeleteSchedule();

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!deviceId) return;
    deleteSchedule.mutate(
      { id, params: { deviceId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey({ deviceId }) });
          toast({ title: "Schedule deleted" });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.data?.message || "Failed to delete", variant: "destructive" });
        }
      }
    );
  };

  if (!deviceId || isLoading) {
    return (
      <Layout>
        <div className="space-y-6 pt-12">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        </div>
      </Layout>
    );
  }

  const completeSchedules = schedules?.filter(s => s.status === "complete") || [];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="flex items-center gap-4 border-b pb-6">
          <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-primary/20">
            <HistoryIcon className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-heading font-semibold text-foreground tracking-tight">History</h1>
            <p className="text-muted-foreground text-lg">Your past schedules and plans.</p>
          </div>
        </header>

        {completeSchedules.length === 0 ? (
          <div className="text-center py-16 px-6 border border-dashed rounded-3xl bg-secondary/10">
            <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mx-auto text-muted-foreground mb-6 shadow-sm border">
              <Calendar className="w-10 h-10 opacity-50" />
            </div>
            <h3 className="text-xl font-medium text-foreground mb-2">No schedules yet</h3>
            <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">Create your first schedule to see it here.</p>
            <Button size="lg" className="rounded-xl shadow-sm" onClick={() => setLocation("/create")}>
              Create a Plan
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {completeSchedules.map((schedule, idx) => (
              <Card 
                key={schedule.id} 
                className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/40 flex flex-col animate-in fade-in slide-in-from-bottom-4 cursor-pointer rounded-2xl bg-card hover:-translate-y-1" 
                style={{ animationDelay: `${idx * 50}ms` }}
                onClick={() => setLocation(`/schedule/${schedule.id}`)}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-primary/10 transition-colors" />
                <CardHeader className="pb-4 relative z-10">
                  <div className="flex justify-between items-start">
                    <CardTitle className="capitalize text-xl font-semibold tracking-tight">{schedule.scope} Plan</CardTitle>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mt-2 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={e => e.stopPropagation()}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={e => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this schedule?</AlertDialogTitle>
                          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={(e) => handleDelete(schedule.id, e as any)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <CardDescription className="flex items-center gap-1.5 text-sm mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(schedule.createdAt), "MMM d, yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto pt-0 relative z-10 flex justify-end">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-sm">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
