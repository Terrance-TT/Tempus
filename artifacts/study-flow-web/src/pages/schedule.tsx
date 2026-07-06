import { useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useDeviceId } from "@/hooks/use-device-id";
import { 
  useGetSchedule, 
  useDeleteSchedule,
  getGetScheduleQueryKey,
  getListSchedulesQueryKey,
  ScheduleBlock,
  DayOfWeek
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, ArrowLeft, Calendar as CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";

const DAYS_ORDER: DayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_NAMES: Record<DayOfWeek, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday"
};

export default function Schedule() {
  const { id } = useParams();
  const deviceId = useDeviceId();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: schedule, isLoading } = useGetSchedule(
    id || "",
    { query: { enabled: !!id, queryKey: getGetScheduleQueryKey(id || "") } }
  );

  const deleteSchedule = useDeleteSchedule();

  const handleDelete = () => {
    if (!id || !deviceId) return;
    deleteSchedule.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey({ deviceId }) });
          toast({ title: "Schedule deleted" });
          setLocation("/history");
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.data?.message, variant: "destructive" });
        }
      }
    );
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "class": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800/50";
      case "homework": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800/50";
      case "extracurricular": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800/50";
      case "routine": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800/50";
      case "break": return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800/50";
      case "free": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
      default: return "bg-secondary text-secondary-foreground border-border";
    }
  };

  if (isLoading || !schedule) {
    return (
      <Layout>
        <div className="space-y-8 pt-8">
          <div className="flex gap-4 items-center">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </Layout>
    );
  }

  // Group blocks by day
  const groupedBlocks = schedule.blocks.reduce((acc, block) => {
    if (!acc[block.day]) acc[block.day] = [];
    acc[block.day].push(block);
    return acc;
  }, {} as Record<string, ScheduleBlock[]>);

  // Sort blocks within days
  Object.values(groupedBlocks).forEach(blocks => {
    blocks.sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 pt-4 pb-12">
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="-ml-4 text-muted-foreground" onClick={() => setLocation(-1 as any)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this schedule?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this generated schedule from your history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <header className="space-y-3 pb-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-heading font-semibold tracking-tight text-foreground capitalize">
                {schedule.scope} Schedule
              </h1>
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                Generated {format(new Date(schedule.createdAt), "MMMM d, yyyy")}
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-10">
          {DAYS_ORDER.map(day => {
            const blocks = groupedBlocks[day];
            if (!blocks || blocks.length === 0) return null;

            return (
              <div key={day} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-xl font-semibold border-l-4 border-primary pl-3 sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                  {DAY_NAMES[day]}
                </h2>
                
                <div className="grid gap-3">
                  {blocks.map(block => (
                    <div 
                      key={block.id} 
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-4 transition-colors hover:shadow-sm ${getCategoryColor(block.category)}`}
                    >
                      <div className="flex items-center gap-2 sm:w-32 shrink-0 font-medium">
                        <Clock className="w-4 h-4 opacity-70" />
                        <span>{block.startTime}</span>
                      </div>
                      
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-lg leading-tight">{block.title}</h3>
                          <Badge variant="outline" className="bg-background/50 capitalize border-current/20">
                            {block.category}
                          </Badge>
                        </div>
                        
                        <div className="text-sm opacity-80 flex items-center gap-2">
                          <span>Ends at {block.endTime}</span>
                          {block.notes && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-current opacity-50" />
                              <span className="truncate">{block.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
