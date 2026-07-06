import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useDeviceId } from "@/hooks/use-device-id";
import { 
  useGetSchedule, 
  useDeleteSchedule,
  useUpdateSchedule,
  useReviseSchedule,
  useGetGoogleCalendarStatus,
  useSyncScheduleToGoogleCalendar,
  useGetScheduleCalendarSyncs,
  getGetScheduleQueryKey,
  getGetScheduleCalendarSyncsQueryKey,
  getListSchedulesQueryKey,
  ScheduleBlock,
  ScheduleBlockInput,
  ScheduleBlockCategory,
  DayOfWeek
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, ArrowLeft, Calendar as CalendarIcon, Clock, Sparkles, Plus, Pencil, Loader2, Send, CalendarCheck2 } from "lucide-react";
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

  const [aiInstruction, setAiInstruction] = useState("");
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [addingForDay, setAddingForDay] = useState<DayOfWeek | null>(null);
  
  // Local edit states
  const [editTitle, setEditTitle] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editCategory, setEditCategory] = useState<ScheduleBlockCategory>("free");
  const [editNotes, setEditNotes] = useState("");

  const { data: schedule, isLoading } = useGetSchedule(
    id || "",
    { deviceId: deviceId || "" },
    { query: { enabled: !!id && !!deviceId, queryKey: getGetScheduleQueryKey(id || "", { deviceId: deviceId || "" }) } }
  );

  const deleteSchedule = useDeleteSchedule();
  const updateSchedule = useUpdateSchedule();
  const reviseSchedule = useReviseSchedule();

  const { data: googleCalendarStatus } = useGetGoogleCalendarStatus();
  const syncGoogleCalendar = useSyncScheduleToGoogleCalendar();
  const { data: calendarSyncs } = useGetScheduleCalendarSyncs(id || "", {
    query: { enabled: !!id, queryKey: getGetScheduleCalendarSyncsQueryKey(id || "") }
  });
  const autoSyncedRef = useRef(false);
  const syncMap = new Map(calendarSyncs?.map(s => [s.blockId, s.googleEventId]) ?? []);

  const handleSyncGoogleCalendar = () => {
    if (!id) return;
    if (!googleCalendarStatus?.connected) {
      const returnTo = `${window.location.pathname}?autoSync=1`;
      window.location.href = `/api/google-calendar/connect?returnTo=${encodeURIComponent(returnTo)}`;
      return;
    }
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    syncGoogleCalendar.mutate(
      { id, data: { timeZone } },
      {
        onSuccess: (data) => {
          toast({ title: "Synced to Google Calendar", description: `${data.syncedCount} event(s) up to date.` });
        },
        onError: (err: any) => {
          if (err?.status === 409) {
            const returnTo = `${window.location.pathname}?autoSync=1`;
            window.location.href = `/api/google-calendar/connect?returnTo=${encodeURIComponent(returnTo)}`;
            return;
          }
          toast({ title: "Sync failed", description: err?.data?.message, variant: "destructive" });
        }
      }
    );
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("googleCalendarConnected")) {
      toast({ title: "Google Calendar connected" });
      window.history.replaceState(null, "", window.location.pathname);
    }
    if (params.has("googleCalendarError")) {
      toast({ title: "Google Calendar connection failed", description: params.get("googleCalendarError") ?? undefined, variant: "destructive" });
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (
      params.get("autoSync") === "1" &&
      !autoSyncedRef.current &&
      googleCalendarStatus?.connected &&
      id
    ) {
      autoSyncedRef.current = true;
      window.history.replaceState(null, "", window.location.pathname);
      handleSyncGoogleCalendar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleCalendarStatus?.connected, id]);

  const handleDelete = () => {
    if (!id || !deviceId) return;
    deleteSchedule.mutate(
      { id, params: { deviceId } },
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

  const handleRevise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !deviceId || !aiInstruction.trim()) return;

    reviseSchedule.mutate(
      { id, data: { deviceId, instruction: aiInstruction } },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetScheduleQueryKey(id, { deviceId: deviceId || "" }), data);
          setAiInstruction("");
          toast({ title: "Schedule updated by AI!" });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.data?.message, variant: "destructive" });
        }
      }
    );
  };

  const handleSaveBlock = () => {
    if (!schedule || !id) return;
    
    let newBlocks: ScheduleBlockInput[] = [...schedule.blocks].map(b => ({
      day: b.day,
      startTime: b.startTime,
      endTime: b.endTime,
      title: b.title,
      category: b.category,
      notes: b.notes
    }));

    if (editingBlock) {
      const index = schedule.blocks.findIndex(b => b.id === editingBlock.id);
      if (index !== -1) {
        newBlocks[index] = {
          day: editingBlock.day,
          title: editTitle,
          startTime: editStart,
          endTime: editEnd,
          category: editCategory,
          notes: editNotes || null
        };
      }
    } else if (addingForDay) {
      newBlocks.push({
        day: addingForDay,
        title: editTitle,
        startTime: editStart,
        endTime: editEnd,
        category: editCategory,
        notes: editNotes || null
      });
    }

    if (!deviceId) return;
    updateSchedule.mutate(
      { id, data: { deviceId, blocks: newBlocks } },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetScheduleQueryKey(id, { deviceId: deviceId || "" }), data);
          setEditingBlock(null);
          setAddingForDay(null);
          toast({ title: "Schedule updated" });
        }
      }
    );
  };

  const handleDeleteBlock = (blockId: string) => {
    if (!schedule || !id || !deviceId) return;
    const newBlocks = schedule.blocks.filter(b => b.id !== blockId).map(b => ({
      day: b.day,
      startTime: b.startTime,
      endTime: b.endTime,
      title: b.title,
      category: b.category,
      notes: b.notes
    }));

    updateSchedule.mutate(
      { id, data: { deviceId, blocks: newBlocks } },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetScheduleQueryKey(id, { deviceId: deviceId || "" }), data);
          toast({ title: "Block removed" });
        }
      }
    );
  };

  const openEdit = (block: ScheduleBlock) => {
    setEditingBlock(block);
    setEditTitle(block.title);
    setEditStart(block.startTime);
    setEditEnd(block.endTime);
    setEditCategory(block.category);
    setEditNotes(block.notes || "");
  };

  const openAdd = (day: DayOfWeek) => {
    setAddingForDay(day);
    setEditTitle("");
    setEditStart("09:00");
    setEditEnd("10:00");
    setEditCategory("free");
    setEditNotes("");
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
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </Layout>
    );
  }

  const groupedBlocks = schedule.blocks.reduce((acc, block) => {
    if (!acc[block.day]) acc[block.day] = [];
    acc[block.day].push(block);
    return acc;
  }, {} as Record<string, ScheduleBlock[]>);

  Object.values(groupedBlocks).forEach(blocks => {
    blocks.sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 pt-4 pb-12">
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="-ml-4 text-muted-foreground" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Home
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSyncGoogleCalendar}
              disabled={syncGoogleCalendar.isPending}
              data-testid="button-sync-google-calendar"
            >
              {syncGoogleCalendar.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CalendarCheck2 className="w-4 h-4 mr-2" />
              )}
              {googleCalendarStatus?.connected ? "Sync to Google Calendar" : "Connect Google Calendar"}
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

        <div className="bg-secondary/40 border border-secondary rounded-2xl p-5 shadow-sm">
          <form onSubmit={handleRevise} className="flex gap-3 items-center">
            <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-primary shrink-0 shadow-sm border">
              <Sparkles className="w-5 h-5" />
            </div>
            <Input 
              placeholder="e.g. Move my homework to the evening, I want to sleep in..." 
              value={aiInstruction}
              onChange={e => setAiInstruction(e.target.value)}
              className="bg-background border-secondary"
            />
            <Button type="submit" size="icon" disabled={reviseSchedule.isPending || !aiInstruction.trim()} className="shrink-0 rounded-xl">
              {reviseSchedule.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>

        <div className="space-y-10">
          {DAYS_ORDER.map(day => {
            const blocks = groupedBlocks[day] || [];
            if (schedule.scope === "day" && blocks.length === 0) return null;

            return (
              <div key={day} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                  <h2 className="text-xl font-semibold border-l-4 border-primary pl-3">
                    {DAY_NAMES[day]}
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => openAdd(day)} className="text-muted-foreground">
                    <Plus className="w-4 h-4 mr-1" /> Add Block
                  </Button>
                </div>
                
                <div className="grid gap-3">
                  {blocks.length === 0 && (
                    <div className="text-center py-6 border border-dashed rounded-xl text-muted-foreground bg-secondary/10">
                      Free day
                    </div>
                  )}
                  {blocks.map(block => {
                    const googleEventId = syncMap.get(block.id);
                    return (
                    <div 
                      key={block.id} 
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-4 transition-colors hover:shadow-sm group ${getCategoryColor(block.category)}`}
                    >
                      <div className="flex items-center gap-2 sm:w-32 shrink-0 font-medium">
                        <Clock className="w-4 h-4 opacity-70" />
                        <span>{block.startTime}</span>
                      </div>
                      
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-lg leading-tight">{block.title}</h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-background/50 capitalize border-current/20">
                              {block.category}
                            </Badge>
                            {googleEventId && (
                              <a
                                href={`https://calendar.google.com/calendar/u/0/r/eventedit/${googleEventId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs opacity-70 hover:opacity-100 hover:underline"
                                title="View on Google Calendar"
                              >
                                <CalendarCheck2 className="w-3 h-3" />
                                <span className="hidden sm:inline">Google</span>
                              </a>
                            )}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(block)}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteBlock(block.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-sm opacity-80 flex items-center gap-2">
                          <span>Ends at {block.endTime}</span>
                          {block.notes && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-current opacity-50" />
                              <span className="truncate max-w-[200px] sm:max-w-xs">{block.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={!!editingBlock || !!addingForDay} onOpenChange={(open) => {
        if (!open) { setEditingBlock(null); setAddingForDay(null); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBlock ? "Edit Block" : "Add Block"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={editStart} onChange={e => setEditStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select 
                value={editCategory} 
                onChange={e => setEditCategory(e.target.value as ScheduleBlockCategory)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="class">Class</option>
                <option value="extracurricular">Extracurricular</option>
                <option value="routine">Routine</option>
                <option value="homework">Homework</option>
                <option value="break">Break</option>
                <option value="free">Free</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Input value={editNotes} onChange={e => setEditNotes(e.target.value)} />
            </div>
            <Button onClick={handleSaveBlock} className="w-full mt-4" disabled={updateSchedule.isPending}>
              {updateSchedule.isPending ? "Saving..." : "Save Block"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
