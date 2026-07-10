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
  DayOfWeek,
  usePreviewSpsEngageIcs,
  type SpsEvent,
} from "@workspace/api-client-react";
import { isFunEvent } from "@/lib/sps-events";
import { placeBlockWithConflictHandling } from "@/lib/schedule-conflicts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, ArrowLeft, Calendar as CalendarIcon, Clock, Sparkles, Plus, Pencil, Loader2, Send, CalendarCheck2, List, LayoutGrid, ExternalLink, PartyPopper, MapPin } from "lucide-react";
import { format } from "date-fns";

const DAYS_ORDER: DayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const JS_DAY_TO_KEY: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function todayKey(): DayOfWeek { return JS_DAY_TO_KEY[new Date().getDay()]; }
function nowMinutes(): number { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); }

function orderedDays(): DayOfWeek[] {
  const today = todayKey();
  const idx = DAYS_ORDER.indexOf(today);
  if (idx === -1) return DAYS_ORDER;
  return [...DAYS_ORDER.slice(idx), ...DAYS_ORDER.slice(0, idx)];
}
const DAY_NAMES: Record<DayOfWeek, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday"
};
const DAY_SHORT: Record<DayOfWeek, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun"
};

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return 0;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

function formatHourLabel(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

export default function Schedule() {
  const { id } = useParams();
  const deviceId = useDeviceId();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [aiInstruction, setAiInstruction] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "week">("list");
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [addingForDay, setAddingForDay] = useState<DayOfWeek | null>(null);
  const [sleepConflict, setSleepConflict] = useState<ScheduleBlock | null>(null);
  
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
  const mountParamsRef = useRef(new URLSearchParams(window.location.search));
  const syncMap = new Map(calendarSyncs?.map(s => [s.blockId, s.googleEventId]) ?? []);

  const viewInitializedRef = useRef(false);
  useEffect(() => {
    if (schedule && !viewInitializedRef.current) {
      viewInitializedRef.current = true;
      if (schedule.scope === "week") setViewMode("week");
    }
  }, [schedule]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reveal") !== "1") return;
    setIsRevealing(true);
    window.history.replaceState({}, "", window.location.pathname);
    const t = setTimeout(() => setIsRevealing(false), 3000);
    return () => clearTimeout(t);
  }, []);

  // Vertical scale for the week grid (pixels per hour). `null` = auto-fit container.
  const [weekHourPx, setWeekHourPx] = useState<number | null>(null);
  const weekGridRef = useRef<HTMLDivElement | null>(null);
  const scaleDragRef = useRef<{ startY: number; startHourPx: number; totalHours: number } | null>(null);
  const [isScalingWeek, setIsScalingWeek] = useState(false);

  const handleScaleDragStart = (e: React.PointerEvent<HTMLDivElement>, totalHours: number) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const startHourPx = weekHourPx ?? (weekGridRef.current ? weekGridRef.current.clientHeight / totalHours : 48);
    scaleDragRef.current = { startY: e.clientY, startHourPx, totalHours };
    setIsScalingWeek(true);
  };
  const handleScaleDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = scaleDragRef.current;
    if (!drag) return;
    const deltaY = e.clientY - drag.startY;
    // Dragging down increases the scale (more px per hour = zoomed in / more spread out).
    const nextHourPx = drag.startHourPx + deltaY / drag.totalHours;
    const clamped = Math.min(220, Math.max(24, nextHourPx));
    setWeekHourPx(clamped);
  };
  const handleScaleDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scaleDragRef.current) {
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    }
    scaleDragRef.current = null;
    setIsScalingWeek(false);
  };

  const previewSpsIcs = usePreviewSpsEngageIcs();
  const [spsEvents, setSpsEvents] = useState<SpsEvent[] | null>(null);
  const [spsFunOnly, setSpsFunOnly] = useState(false);
  const spsDisplayed = spsFunOnly && spsEvents
    ? spsEvents.filter((ev) => isFunEvent(ev.title))
    : spsEvents ?? [];
  useEffect(() => {
    const icsUrl = localStorage.getItem("spsIcsUrl");
    if (!icsUrl) return;
    previewSpsIcs.mutate(
      { data: { icsUrl } },
      {
        onSuccess: (events) => setSpsEvents(events.slice(0, 10)),
        onError: () => {},
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          queryClient.invalidateQueries({ queryKey: getGetScheduleCalendarSyncsQueryKey(id) });
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
    const params = mountParamsRef.current;
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
    const params = mountParamsRef.current;
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
          setLocation("/");
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

  // FIX: Add time validation before saving blocks
  const handleSaveBlock = () => {
    if (!schedule || !id) return;

    // Validate start time < end time
    const startMin = timeToMinutes(editStart);
    const endMin = timeToMinutes(editEnd);
    if (startMin >= endMin) {
      toast({
        title: "Invalid time range",
        description: "Start time must be before end time.",
        variant: "destructive",
      });
      return;
    }

    let newBlocks: ScheduleBlockInput[] = [...schedule.blocks].map(b => ({
      id: b.id,
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
          id: editingBlock.id,
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
          queryClient.invalidateQueries({ queryKey: getGetScheduleCalendarSyncsQueryKey(id) });
          setEditingBlock(null);
          setAddingForDay(null);
          toast({ title: "Schedule updated" });
        }
      }
    );
  };

  const addPickupGameMutation = useUpdateSchedule({
    mutation: {
      onSuccess: (data) => {
        if (!id) return;
        queryClient.setQueryData(getGetScheduleQueryKey(id, { deviceId: deviceId || "" }), data);
        queryClient.invalidateQueries({ queryKey: getGetScheduleCalendarSyncsQueryKey(id) });
        toast({ title: "Pickup Games added! ⚽", description: "Today, 7:00pm at Lerner Hall Field." });
      },
      onError: (err: any) => {
        toast({ title: "Couldn't add it", description: err?.message || "Please try again.", variant: "destructive" });
      },
    },
  });

  const pickupGameDetails = {
    startTime: "19:00",
    endTime: "20:00",
    title: "Pickup Games — Soccer",
    category: "extracurricular" as const,
    notes: "Lerner Hall Field",
  };

  const commitPickupGame = (blocks: ScheduleBlockInput[]) => {
    if (!id || !deviceId) return;
    addPickupGameMutation.mutate({
      id,
      data: { deviceId, blocks: [...blocks, { day: todayKey(), ...pickupGameDetails }] },
    });
  };

  const handleAddPickupGame = () => {
    if (!schedule || !id || !deviceId) return;

    const result = placeBlockWithConflictHandling(
      schedule.blocks,
      todayKey(),
      pickupGameDetails.startTime,
      pickupGameDetails.endTime
    );

    if (!result.ok) {
      setSleepConflict(result.sleepConflict);
      return;
    }

    if (result.moved.length > 0) {
      const moved = result.moved[0];
      toast({
        title: "Moved to make room",
        description: `Shifted "${moved.title}" to ${moved.toStart}–${moved.toEnd} so Pickup Games fits at 7:00pm.`,
      });
    }

    commitPickupGame(result.blocks);
  };

  const handleAddPickupGameAnyway = () => {
    if (!schedule || !deviceId) return;
    const existingBlocks: ScheduleBlockInput[] = schedule.blocks.map(b => ({
      id: b.id,
      day: b.day,
      startTime: b.startTime,
      endTime: b.endTime,
      title: b.title,
      category: b.category,
      notes: b.notes,
    }));
    setSleepConflict(null);
    commitPickupGame(existingBlocks);
  };

  const handleDeleteBlock = (blockId: string) => {
    if (!schedule || !id || !deviceId) return;
    const newBlocks = schedule.blocks.filter(b => b.id !== blockId).map(b => ({
      id: b.id,
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
          queryClient.invalidateQueries({ queryKey: getGetScheduleCalendarSyncsQueryKey(id) });
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
      <>
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
      </>
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
    <>
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

        <AlertDialog open={!!sleepConflict} onOpenChange={(open) => { if (!open) setSleepConflict(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>This overlaps with your sleep</AlertDialogTitle>
              <AlertDialogDescription>
                Pickup Games (7:00pm–8:00pm) conflicts with "{sleepConflict?.title}"
                {sleepConflict ? ` (${sleepConflict.startTime}–${sleepConflict.endTime})` : ""}.
                We won't move your sleep schedule automatically — add it anyway, or cancel and pick a different time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSleepConflict(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleAddPickupGameAnyway}>
                Add anyway
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {spsEvents && spsEvents.length > 0 && (
          <div className="rounded-2xl border-2 border-blue-400 dark:border-blue-700 bg-blue-50/60 dark:bg-blue-950/25 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-blue-300 dark:border-blue-700 bg-blue-600 text-white">
              <CalendarIcon className="w-4 h-4" />
              <span className="font-bold text-sm tracking-wide flex-1">SPS Engage — Upcoming Events</span>
              <button
                type="button"
                onClick={() => setSpsFunOnly((v) => !v)}
                className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors font-medium ${spsFunOnly ? "bg-white text-blue-700 border-white" : "border-white/50 text-white/80 hover:border-white hover:text-white"}`}
              >
                <PartyPopper className="w-3 h-3" />
                {spsFunOnly ? "Fun only" : "All"}
              </button>
            </div>
            {spsDisplayed.length === 0 ? (
              <p className="px-4 py-3 text-sm text-blue-700 dark:text-blue-300">No fun events in the next 14 days — <button type="button" className="underline" onClick={() => setSpsFunOnly(false)}>show all</button>.</p>
            ) : (
              <div className="divide-y divide-blue-100 dark:divide-blue-900">
                {spsDisplayed.map((ev) => {
                  const start = new Date(ev.startIso);
                  const end = new Date(ev.endIso);
                  const dateStr = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
                  const startTime = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
                  const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
                  return (
                    <div key={ev.uid} className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-100/60 dark:hover:bg-blue-900/30 transition-colors">
                      <p className="text-xs text-blue-700 dark:text-blue-300 w-40 shrink-0 tabular-nums font-medium">{dateStr} · {startTime}–{endTime}</p>
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 truncate flex-1">{ev.title}</p>
                      {ev.location && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 hidden sm:block shrink-0 max-w-32 truncate">{ev.location}</p>
                      )}
                      {ev.url && (
                        <a href={ev.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 shrink-0">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <header className="space-y-3 pb-6 border-b">
          <div className="flex items-center justify-between gap-3 flex-wrap">
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

            {schedule.scope === "week" && (
              <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-lg" data-testid="toggle-view-mode">
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  className={viewMode === "list" ? "bg-background shadow-sm" : "text-muted-foreground"}
                  onClick={() => setViewMode("list")}
                  data-testid="button-view-list"
                >
                  <List className="w-4 h-4 mr-1.5" /> List
                </Button>
                <Button
                  variant={viewMode === "week" ? "secondary" : "ghost"}
                  size="sm"
                  className={viewMode === "week" ? "bg-background shadow-sm" : "text-muted-foreground"}
                  onClick={() => setViewMode("week")}
                  data-testid="button-view-week"
                >
                  <LayoutGrid className="w-4 h-4 mr-1.5" /> Week
                </Button>
              </div>
            )}
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

        <button
          onClick={handleAddPickupGame}
          disabled={addPickupGameMutation.isPending}
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
              {addPickupGameMutation.isPending ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white text-emerald-700 font-bold text-sm px-4 py-2 shadow-sm transition-transform group-hover:scale-105">
                  <Plus className="w-4 h-4" /> Add to schedule
                </span>
              )}
            </div>
          </div>
        </button>

        {viewMode === "list" && (
        <div className="space-y-10">
          {(() => { let revealIdx = 0; return orderedDays().map(day => {
            const blocks = groupedBlocks[day] || [];
            if (schedule.scope === "day" && blocks.length === 0) return null;

            const isToday = day === todayKey();
            const now = nowMinutes();

            let displayBlocks = blocks;
            let pastBlocks: typeof blocks = [];
            let showNowDivider = false;
            if (isToday && blocks.length > 0) {
              const upcoming = blocks.filter(b => timeToMinutes(b.endTime) > now);
              pastBlocks = blocks.filter(b => timeToMinutes(b.endTime) <= now);
              displayBlocks = upcoming;
              showNowDivider = pastBlocks.length > 0;
            }

            return (
              <div key={day} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                  <h2 className="text-xl font-semibold border-l-4 border-primary pl-3 flex items-center gap-2">
                    {DAY_NAMES[day]}
                    {isToday && (
                      <span className="text-xs font-medium bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                        Today
                      </span>
                    )}
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
                  {displayBlocks.map(block => {
                    const googleEventId = syncMap.get(block.id);
                    const rIdx = revealIdx++;
                    return (
                    <div 
                      key={block.id} 
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-4 transition-colors hover:shadow-sm group ${getCategoryColor(block.category)}${isRevealing ? " animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" : ""}`}
                      style={isRevealing ? { animationDelay: `${rIdx * 70}ms` } : undefined}
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

                  {showNowDivider && (
                    <>
                      <div className="flex items-center gap-3 py-1">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs text-muted-foreground font-medium">Earlier today</span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                      {pastBlocks.map(block => {
                        const googleEventId = syncMap.get(block.id);
                        const rIdx = revealIdx++;
                        return (
                          <div
                            key={block.id}
                            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-4 transition-colors hover:shadow-sm group opacity-45 ${getCategoryColor(block.category)}${isRevealing ? " animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" : ""}`}
                            style={isRevealing ? { animationDelay: `${rIdx * 70}ms` } : undefined}
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
                                    <a href={`https://calendar.google.com/calendar/u/0/r/eventedit/${googleEventId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs opacity-70 hover:opacity-100 hover:underline" title="View on Google Calendar">
                                      <CalendarCheck2 className="w-3 h-3" />
                                    </a>
                                  )}
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(block)}><Pencil className="w-3 h-3" /></Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteBlock(block.id)}><Trash2 className="w-3 h-3" /></Button>
                                  </div>
                                </div>
                              </div>
                              <div className="text-sm opacity-80 flex items-center gap-2">
                                <span>Ends at {block.endTime}</span>
                                {block.notes && (<><span className="w-1 h-1 rounded-full bg-current opacity-50" /><span className="truncate max-w-[200px] sm:max-w-xs">{block.notes}</span></>)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            );
          })
        })()}
        </div>
        )}

        {viewMode === "week" && (() => {
          const allBlocks = schedule.blocks;
          const starts = allBlocks.map(b => timeToMinutes(b.startTime));
          const ends = allBlocks.map(b => {
            const s = timeToMinutes(b.startTime);
            const e = timeToMinutes(b.endTime);
            return e > s ? e : s + 30;
          });
          const minStart = Math.floor((starts.length ? Math.min(...starts) : 7 * 60) / 60) * 60;
          const maxEnd = Math.ceil((ends.length ? Math.max(...ends) : 22 * 60) / 60) * 60;
          const total = Math.max(maxEnd - minStart, 60);
          const hourMarks: number[] = [];
          for (let m = minStart + 60; m < maxEnd; m += 60) hourMarks.push(m);

          const totalHours = total / 60;

          return (
            <div className="rounded-2xl border bg-card overflow-hidden animate-in fade-in duration-300" data-testid="week-grid">
              <div className="grid border-b bg-secondary/20" style={{ gridTemplateColumns: "3rem repeat(7, 1fr)" }}>
                <div />
                {DAYS_ORDER.map(day => (
                  <div key={day} className="text-center py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-l">
                    {DAY_SHORT[day]}
                  </div>
                ))}
              </div>
              <div
                ref={weekGridRef}
                className="grid"
                style={{
                  gridTemplateColumns: "3rem repeat(7, 1fr)",
                  height: weekHourPx ? `${weekHourPx * totalHours}px` : "calc(100dvh - 22rem)",
                  minHeight: "440px",
                }}
              >
                <div
                  className={`relative touch-none select-none cursor-ns-resize ${isScalingWeek ? "bg-secondary/30" : ""}`}
                  data-testid="week-scale-handle"
                  title="Drag up or down to adjust the time scale"
                  onPointerDown={(e) => handleScaleDragStart(e, totalHours)}
                  onPointerMove={handleScaleDragMove}
                  onPointerUp={handleScaleDragEnd}
                  onPointerCancel={handleScaleDragEnd}
                >
                  {hourMarks.map(m => (
                    <span
                      key={m}
                      className="absolute right-1.5 -translate-y-1/2 text-[9px] tabular-nums text-muted-foreground"
                      style={{ top: `${((m - minStart) / total) * 100}%` }}
                    >
                      {formatHourLabel(m)}
                    </span>
                  ))}
                  {nowMinutes() >= minStart && nowMinutes() <= minStart + total && (
                    <span
                      className="absolute right-1.5 -translate-y-1/2 text-[9px] tabular-nums text-primary font-semibold"
                      style={{ top: `${((nowMinutes() - minStart) / total) * 100}%` }}
                    >
                      now
                    </span>
                  )}
                </div>
                {DAYS_ORDER.map(day => {
                  const blocks = groupedBlocks[day] || [];
                  const isToday = day === todayKey();
                  const nowPct = ((nowMinutes() - minStart) / total) * 100;
                  const showNowLine = isToday && nowMinutes() >= minStart && nowMinutes() <= minStart + total;
                  return (
                    <div key={day} className="relative border-l">
                      {hourMarks.map(m => (
                        <div
                          key={m}
                          className="absolute left-0 right-0 border-t border-border/40 pointer-events-none"
                          style={{ top: `${((m - minStart) / total) * 100}%` }}
                        />
                      ))}
                      {showNowLine && (
                        <div
                          className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                          style={{ top: `${nowPct}%` }}
                        >
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0 -ml-1" />
                          <div className="h-[2px] flex-1 bg-primary opacity-80" />
                        </div>
                      )}
                      {blocks.map(block => {
                        const s = timeToMinutes(block.startTime);
                        let e = timeToMinutes(block.endTime);
                        if (e <= s) e = s + 30;
                        const top = ((s - minStart) / total) * 100;
                        const height = ((e - s) / total) * 100;
                        return (
                          <button
                            key={block.id}
                            onClick={() => openEdit(block)}
                            className={`absolute left-0.5 right-0.5 rounded-md border px-1 py-0.5 text-left overflow-hidden transition-shadow hover:shadow-md hover:z-10 ${getCategoryColor(block.category)}`}
                            style={{ top: `${top}%`, height: `${height}%`, minHeight: "14px" }}
                            title={`${block.title} · ${block.startTime}–${block.endTime}`}
                            data-testid={`grid-block-${block.id}`}
                          >
                            <p className="text-[10px] font-semibold leading-tight truncate">{block.title}</p>
                            <p className="text-[9px] opacity-70 leading-tight truncate hidden md:block">{block.startTime}</p>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
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
    </>
  );
}
