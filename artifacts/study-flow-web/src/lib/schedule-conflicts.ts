import type { ScheduleBlock, ScheduleBlockInput, DayOfWeek } from "@workspace/api-client-react";

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return 0;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

export function minutesToTime(mins: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, mins));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isSleepBlock(block: { category: string; title: string }): boolean {
  return block.category === "routine" && /sleep|bedtime/i.test(block.title);
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export interface MovedBlockSummary {
  title: string;
  fromStart: string;
  fromEnd: string;
  toStart: string;
  toEnd: string;
}

export type PlacementResult =
  | { ok: true; blocks: ScheduleBlockInput[]; moved: MovedBlockSummary[] }
  | { ok: false; sleepConflict: ScheduleBlock };

/**
 * Places a new block on `day` at [startTime, endTime), shifting any conflicting
 * non-sleep blocks later (cascading as needed) to make room. If the new block
 * conflicts with a sleep/bedtime block (directly or via cascade), placement is
 * aborted so the caller can ask the user for clarification instead of silently
 * disturbing their sleep schedule.
 */
export function placeBlockWithConflictHandling(
  existingBlocks: ScheduleBlock[],
  day: DayOfWeek,
  startTime: string,
  endTime: string
): PlacementResult {
  const ns = timeToMinutes(startTime);
  const ne = timeToMinutes(endTime);

  const dayBlocks = existingBlocks
    .filter((b) => b.day === day)
    .slice()
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  // First pass: any direct overlap with a sleep block is an immediate conflict.
  for (const b of dayBlocks) {
    const bs = timeToMinutes(b.startTime);
    const be = timeToMinutes(b.endTime);
    if (overlaps(ns, ne, bs, be) && isSleepBlock(b)) {
      return { ok: false, sleepConflict: b };
    }
  }

  const updates = new Map<string, { startTime: string; endTime: string }>();
  const moved: MovedBlockSummary[] = [];
  let cursor = ne;

  for (const b of dayBlocks) {
    const bs = timeToMinutes(b.startTime);
    const be = timeToMinutes(b.endTime);
    if (bs < ns) continue; // starts before the new block; direct-overlap case already handled above
    if (bs >= cursor) break; // no more cascading needed, gap found

    if (isSleepBlock(b)) {
      return { ok: false, sleepConflict: b };
    }

    const duration = be - bs;
    const newStart = cursor;
    const newEnd = newStart + duration;
    updates.set(b.id, { startTime: minutesToTime(newStart), endTime: minutesToTime(newEnd) });
    moved.push({
      title: b.title,
      fromStart: b.startTime,
      fromEnd: b.endTime,
      toStart: minutesToTime(newStart),
      toEnd: minutesToTime(newEnd),
    });
    cursor = newEnd;
  }

  const blocks: ScheduleBlockInput[] = existingBlocks.map((b) => {
    const update = updates.get(b.id);
    return {
      id: b.id,
      day: b.day,
      startTime: update?.startTime ?? b.startTime,
      endTime: update?.endTime ?? b.endTime,
      title: b.title,
      category: b.category,
      notes: b.notes,
    };
  });

  return { ok: true, blocks, moved };
}
