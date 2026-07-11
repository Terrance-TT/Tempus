import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface ScheduleBlock {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  type: "class" | "study" | "meal" | "exercise" | "sleep" | "other";
  days: string[];
}

export interface Schedule {
  id: string;
  name: string;
  createdAt: string;
  blocks: ScheduleBlock[];
}

export interface FocusSession {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  type: "pomodoro" | "extended" | "custom";
  completed: boolean;
}

export interface Assignment {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  completed: boolean;
  source: "canvas" | "schoology" | "classroom" | "manual";
  points?: number;
}

export interface UserPreferences {
  name: string;
  wakeTime: string;
  sleepTime: string;
  dailyGoalHours: number;
}

const SAMPLE_SCHEDULE: Schedule = {
  id: "sample-1",
  name: "Fall Semester",
  createdAt: new Date().toISOString(),
  blocks: [
    { id: "b1", title: "Physics PHYS 1601", startTime: "09:10", endTime: "10:25", type: "class", days: ["Mon", "Wed"] },
    { id: "b2", title: "Computer Science COMS 3157", startTime: "11:40", endTime: "12:55", type: "class", days: ["Mon", "Wed", "Fri"] },
    { id: "b3", title: "Calculus MATH 2065", startTime: "13:10", endTime: "14:25", type: "class", days: ["Tue", "Thu"] },
    { id: "b4", title: "Writing ENGL 1010", startTime: "14:40", endTime: "15:55", type: "class", days: ["Tue", "Thu"] },
    { id: "b5", title: "Lunch", startTime: "12:30", endTime: "13:30", type: "meal", days: ["Mon", "Wed", "Fri"] },
    { id: "b6", title: "Study Block", startTime: "16:00", endTime: "18:00", type: "study", days: ["Mon", "Wed", "Fri"] },
    { id: "b7", title: "Study Block", startTime: "15:00", endTime: "17:00", type: "study", days: ["Tue", "Thu"] },
    { id: "b8", title: "Gym / Exercise", startTime: "18:30", endTime: "19:30", type: "exercise", days: ["Mon", "Wed", "Fri"] },
    { id: "b9", title: "Dinner", startTime: "19:30", endTime: "20:30", type: "meal", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
    { id: "b10", title: "Evening Study", startTime: "20:30", endTime: "23:00", type: "study", days: ["Mon", "Tue", "Wed", "Thu"] },
  ],
};

const today = new Date();
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

const SAMPLE_ASSIGNMENTS: Assignment[] = [
  { id: "a1", title: "Problem Set 4 — Thermodynamics", course: "Physics 1601", dueDate: addDays(today, 0).toISOString(), completed: false, source: "canvas", points: 100 },
  { id: "a2", title: "Lab Report: Wave Interference", course: "Physics 1601", dueDate: addDays(today, 1).toISOString(), completed: false, source: "canvas", points: 50 },
  { id: "a3", title: "Project Milestone 2", course: "COMS 3157", dueDate: addDays(today, 2).toISOString(), completed: false, source: "canvas", points: 150 },
  { id: "a4", title: "Essay Draft — Final Version", course: "Writing 1010", dueDate: addDays(today, 3).toISOString(), completed: false, source: "schoology", points: 100 },
  { id: "a5", title: "Integration Techniques Quiz", course: "Calculus 2065", dueDate: addDays(today, 5).toISOString(), completed: false, source: "canvas", points: 40 },
  { id: "a6", title: "Reading Response #7", course: "Writing 1010", dueDate: addDays(today, 7).toISOString(), completed: false, source: "schoology", points: 25 },
  { id: "a7", title: "Midterm Review Problem Set", course: "Calculus 2065", dueDate: addDays(today, 10).toISOString(), completed: false, source: "canvas", points: 75 },
  { id: "a8", title: "Software Design Patterns HW", course: "COMS 3157", dueDate: addDays(today, -1).toISOString(), completed: true, source: "canvas", points: 60 },
];

const STORAGE_KEYS = {
  sessions: "tempus:focus_sessions",
  assignments: "tempus:assignments",
  preferences: "tempus:preferences",
  schedules: "tempus:schedules",
};

interface AppContextValue {
  schedules: Schedule[];
  activeSchedule: Schedule | null;
  focusSessions: FocusSession[];
  assignments: Assignment[];
  preferences: UserPreferences;
  addFocusSession: (session: FocusSession) => Promise<void>;
  toggleAssignment: (id: string) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  todayStudySeconds: number;
  weekStudySeconds: number[];
  streakDays: number;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [schedules, setSchedules] = useState<Schedule[]>([SAMPLE_SCHEDULE]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>(SAMPLE_ASSIGNMENTS);
  const [preferences, setPreferences] = useState<UserPreferences>({
    name: "Student",
    wakeTime: "07:00",
    sleepTime: "23:00",
    dailyGoalHours: 4,
  });

  useEffect(() => {
    (async () => {
      try {
        const [sessionsRaw, assignmentsRaw, prefsRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.sessions),
          AsyncStorage.getItem(STORAGE_KEYS.assignments),
          AsyncStorage.getItem(STORAGE_KEYS.preferences),
        ]);
        if (sessionsRaw) setFocusSessions(JSON.parse(sessionsRaw));
        if (assignmentsRaw) setAssignments(JSON.parse(assignmentsRaw));
        if (prefsRaw) setPreferences((p) => ({ ...p, ...JSON.parse(prefsRaw) }));
      } catch {}
    })();
  }, []);

  const addFocusSession = useCallback(async (session: FocusSession) => {
    setFocusSessions((prev) => {
      const next = [session, ...prev];
      AsyncStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const toggleAssignment = useCallback((id: string) => {
    setAssignments((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a));
      AsyncStorage.setItem(STORAGE_KEYS.assignments, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const updatePreferences = useCallback((prefs: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...prefs };
      AsyncStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const todayStudySeconds = focusSessions
    .filter((s) => {
      const t = new Date(s.startedAt).getTime();
      return t >= todayStart.getTime() && t < todayEnd.getTime() && s.completed;
    })
    .reduce((sum, s) => sum + s.durationSeconds, 0);

  const weekStudySeconds = Array.from({ length: 7 }, (_, i) => {
    const dayStart = new Date(todayStart.getTime() - (6 - i) * 86400000);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    return focusSessions
      .filter((s) => {
        const t = new Date(s.startedAt).getTime();
        return t >= dayStart.getTime() && t < dayEnd.getTime() && s.completed;
      })
      .reduce((sum, s) => sum + s.durationSeconds, 0);
  });

  let streakDays = 0;
  for (let i = 0; i < 30; i++) {
    const dayStart = new Date(todayStart.getTime() - i * 86400000);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const daySeconds = focusSessions
      .filter((s) => {
        const t = new Date(s.startedAt).getTime();
        return t >= dayStart.getTime() && t < dayEnd.getTime() && s.completed;
      })
      .reduce((sum, s) => sum + s.durationSeconds, 0);
    if (daySeconds >= 1800) streakDays++;
    else if (i > 0) break;
  }

  return (
    <AppContext.Provider
      value={{
        schedules,
        activeSchedule: schedules[0] ?? null,
        focusSessions,
        assignments,
        preferences,
        addFocusSession,
        toggleAssignment,
        updatePreferences,
        todayStudySeconds,
        weekStudySeconds,
        streakDays,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export function getTodayBlocks(schedule: Schedule | null): ScheduleBlock[] {
  if (!schedule) return [];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayDay = days[new Date().getDay()];
  return schedule.blocks
    .filter((b) => b.days.includes(todayDay))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function blockTypeColor(type: ScheduleBlock["type"], primary: string, accent: string): string {
  switch (type) {
    case "class": return primary;
    case "study": return "#3b82f6";
    case "meal": return accent;
    case "exercise": return "#f97316";
    case "sleep": return "#8b5cf6";
    default: return "#6b7280";
  }
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
