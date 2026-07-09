import { openai } from "@workspace/integrations-openai-ai-server";
import { writeFileSync } from "fs";

const MODEL = "gpt-5.4-mini";

const generationResultSchema = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["needs_clarification", "complete"] },
    questions: { type: "array", items: { type: "string" } },
    blocks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day: { type: "string", enum: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] },
          startTime: { type: "string" },
          endTime: { type: "string" },
          title: { type: "string" },
          category: {
            type: "string",
            enum: ["class", "extracurricular", "routine", "homework", "break", "free"],
          },
          notes: { type: ["string", "null"] },
        },
        required: ["day", "startTime", "endTime", "title", "category", "notes"],
        additionalProperties: false,
      },
    },
  },
  required: ["status", "questions", "blocks"],
  additionalProperties: false,
} as const;

function buildSystemPrompt(scope: "day" | "week"): string {
  const weekExtra =
    scope === "week"
      ? `\n- CRITICAL: The schedule MUST include blocks for ALL seven days: mon, tue, wed, thu, fri, sat, AND sun. Every single day must appear at least once in the blocks array. Do NOT put all blocks on the same day or skip any day.`
      : "";
  return `You are an expert student schedule planner. Given a student's recurring commitments (classes, extracurriculars, personal routines like meals/sleep) and a list of assignments/tasks they need to complete, produce a realistic, well-balanced ${scope === "day" ? "single day" : "full week (mon-sun)"} schedule.

Rules:
- Never overlap two blocks on the same day.
- Keep all of the student's fixed commitments in place at their given times.
- Create dedicated homework/study blocks for the provided tasks. Prioritize tasks by their due date (soonest first) and allocate roughly the estimated time when provided. Title these blocks after the task (e.g. "Work on Biology essay").
- DEADLINE TRUST: Always schedule a task to be completed by its stated due date — if a student says something is due Monday, plan to finish it by Monday. Do not move it earlier just to be "safe".
- DEADLINE MISMATCH CHECK: Before scheduling, cross-reference each task's due date against the student's commitments. If a task's subject/class clearly does not appear in the student's schedule on the stated due day (e.g. "English essay due Wednesday" but English only meets Monday/Friday), flag this as a clarifying question (e.g. "You mentioned your English essay is due Wednesday, but English isn't on your schedule that day — did you mean Friday?"). Do not silently reschedule; ask first. If there is no relevant subject commitment to cross-reference (e.g. a personal project), trust the due date as given.
- Fill remaining gaps between fixed commitments with sensible additions: breaks, meals, and free time, respecting existing routines (e.g. don't schedule homework during dinner).
- The student may have already provided their preferences (wake-up time, bedtime, meal times, and extra notes) in priorAnswers. Respect them: never schedule anything before wake-up or after bedtime, and place meals at the given times.
- If a preference is missing, use sensible student defaults (wake 7:00, bed 22:30, breakfast/lunch/dinner at typical times) rather than asking. Only set status to "needs_clarification" (with 1-4 short, specific questions) as a last resort when the schedule genuinely cannot be built sensibly without an answer. Do not ask about things already covered by existing commitments, tasks, or prior answers.
- MEAL TIMES ARE A GUIDE, NOT A HARD RULE: never overlap two blocks (per the no-overlap rule above). If a given or default meal time (breakfast/lunch/dinner) would fall inside a fixed commitment (e.g. school, a class, practice) that runs through that time, do NOT force the meal in afterward at a nonsensical hour or overlap it — simply drop that meal block for that day rather than placing it awkwardly (e.g. lunch at 3pm right after school ends). Only schedule a meal block on a day when there is a sensible, non-overlapping gap near its usual time.
- Only produce status "complete" with full "blocks" once you have enough information to build a sensible schedule.
- Keep block titles short and student-friendly (e.g. "Dinner", "Math homework", "Free time").
- "blocks" must be empty when status is "needs_clarification", and "questions" must be empty when status is "complete".${weekExtra}`;
}

type Block = {
  day: string;
  startTime: string;
  endTime: string;
  title: string;
  category: string;
  notes?: string | null;
};

const scenarios: Array<{
  name: string;
  scope: "day" | "week";
  payload: unknown;
}> = [
  {
    name: "Columbia student, Canvas assignments, week",
    scope: "week",
    payload: {
      scope: "week",
      commitments: [
        { title: "Entrepreneurship with Daniel", type: "class", daysOfWeek: ["mon", "tue", "wed", "thu", "fri"], startTime: "09:10", endTime: "11:00", notes: null },
        { title: "Entrepreneurship with Daniel", type: "class", daysOfWeek: ["mon", "tue", "wed", "thu", "fri"], startTime: "13:10", endTime: "15:00", notes: null },
        { title: "Lunch", type: "routine", daysOfWeek: ["mon", "tue", "wed", "thu", "fri"], startTime: "11:00", endTime: "13:00", notes: null },
      ],
      tasks: [
        { title: "Entrepreneurship: Market research memo", dueDate: "2026-07-13", estimatedMinutes: 120, notes: null },
        { title: "Entrepreneurship: Pitch deck draft", dueDate: "2026-07-15", estimatedMinutes: 180, notes: null },
        { title: "Personal: Internship applications", dueDate: "2026-07-17", estimatedMinutes: 90, notes: null },
      ],
      priorAnswers: [
        { question: "Wake-up time?", answer: "7:30" },
        { question: "Bedtime?", answer: "23:00" },
        { question: "Anything else?", answer: "Preferred study time: evening. Focus session length: 90 minutes" },
      ],
    },
  },
  {
    name: "High schooler with sports, week",
    scope: "week",
    payload: {
      scope: "week",
      commitments: [
        { title: "School", type: "class", daysOfWeek: ["mon", "tue", "wed", "thu", "fri"], startTime: "08:00", endTime: "15:00", notes: null },
        { title: "Soccer practice", type: "extracurricular", daysOfWeek: ["tue", "thu"], startTime: "16:00", endTime: "17:30", notes: null },
        { title: "Piano lesson", type: "extracurricular", daysOfWeek: ["wed"], startTime: "18:00", endTime: "19:00", notes: null },
      ],
      tasks: [
        { title: "Math worksheet", dueDate: "2026-07-10", estimatedMinutes: 45, notes: null },
        { title: "Biology essay", dueDate: "2026-07-14", estimatedMinutes: 120, notes: null },
        { title: "History reading ch. 7", dueDate: "2026-07-13", estimatedMinutes: 60, notes: null },
      ],
      priorAnswers: [],
    },
  },
  {
    name: "Packed single day, tight gaps",
    scope: "day",
    payload: {
      scope: "day",
      commitments: [
        { title: "Chem lecture", type: "class", daysOfWeek: ["mon"], startTime: "09:00", endTime: "10:30", notes: null },
        { title: "Calc recitation", type: "class", daysOfWeek: ["mon"], startTime: "11:00", endTime: "12:00", notes: null },
        { title: "Work shift (library)", type: "extracurricular", daysOfWeek: ["mon"], startTime: "14:00", endTime: "18:00", notes: null },
      ],
      tasks: [
        { title: "Chem problem set", dueDate: "2026-07-10", estimatedMinutes: 90, notes: null },
        { title: "Calc homework 12", dueDate: "2026-07-10", estimatedMinutes: 60, notes: null },
      ],
      priorAnswers: [
        { question: "Wake-up time?", answer: "8:00" },
        { question: "Bedtime?", answer: "23:30" },
      ],
    },
  },
  {
    name: "Deadline mismatch trap (should ask, not silently fix)",
    scope: "week",
    payload: {
      scope: "week",
      commitments: [
        { title: "English", type: "class", daysOfWeek: ["mon", "fri"], startTime: "10:00", endTime: "11:00", notes: null },
        { title: "Math", type: "class", daysOfWeek: ["tue", "thu"], startTime: "09:00", endTime: "10:00", notes: null },
      ],
      tasks: [
        { title: "English essay", dueDate: "2026-07-15", estimatedMinutes: 120, notes: "due Wednesday" },
      ],
      priorAnswers: [],
    },
  },
  {
    name: "Minimal input, sensible defaults expected",
    scope: "week",
    payload: {
      scope: "week",
      commitments: [
        { title: "CS lecture", type: "class", daysOfWeek: ["mon", "wed"], startTime: "10:00", endTime: "11:30", notes: null },
      ],
      tasks: [
        { title: "CS project milestone", dueDate: "2026-07-16", estimatedMinutes: 240, notes: null },
      ],
      priorAnswers: [],
    },
  },
];

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function findOverlaps(blocks: Block[]): string[] {
  const issues: string[] = [];
  const byDay = new Map<string, Block[]>();
  for (const b of blocks) {
    if (!byDay.has(b.day)) byDay.set(b.day, []);
    byDay.get(b.day)!.push(b);
  }
  for (const [day, dayBlocks] of byDay) {
    const sorted = [...dayBlocks].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    for (let i = 1; i < sorted.length; i++) {
      if (toMinutes(sorted[i].startTime) < toMinutes(sorted[i - 1].endTime)) {
        issues.push(`${day}: "${sorted[i - 1].title}" overlaps "${sorted[i].title}"`);
      }
    }
  }
  return issues;
}

async function runScenario(s: (typeof scenarios)[number]) {
  const started = Date.now();
  const response = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 4096,
    messages: [
      { role: "system", content: buildSystemPrompt(s.scope) },
      { role: "user", content: JSON.stringify(s.payload) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "schedule_generation_result", strict: true, schema: generationResultSchema },
    },
  });
  const durationMs = Date.now() - started;
  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("no content");
  const parsed = JSON.parse(raw) as { status: string; questions: string[]; blocks: Block[] };

  const blocks = parsed.blocks ?? [];
  const distinctDays = new Set(blocks.map((b) => b.day)).size;
  const overlaps = findOverlaps(blocks);
  const commitments = (s.payload as any).commitments as Array<{ title: string; daysOfWeek: string[]; startTime: string; endTime: string }>;
  const missingCommitments: string[] = [];
  for (const c of commitments) {
    for (const day of c.daysOfWeek) {
      if (s.scope === "day" && day !== "mon") continue;
      const present = blocks.some(
        (b) => b.day === day && b.startTime === c.startTime && b.endTime === c.endTime,
      );
      if (!present) missingCommitments.push(`${c.title} (${day} ${c.startTime}-${c.endTime})`);
    }
  }
  const taskTitles = ((s.payload as any).tasks as Array<{ title: string }>).map((t) => t.title);
  const tasksScheduled = taskTitles.filter((t) =>
    blocks.some((b) => b.category === "homework" && (b.title.toLowerCase().includes(t.split(":").pop()!.trim().toLowerCase().slice(0, 12)) || b.title.toLowerCase().includes(t.toLowerCase().slice(0, 12)))),
  ).length;

  const usage = response.usage;
  return {
    name: s.name,
    scope: s.scope,
    status: parsed.status,
    questions: parsed.questions ?? [],
    blockCount: blocks.length,
    distinctDays,
    overlaps,
    missingCommitments,
    tasksRequested: taskTitles.length,
    tasksScheduled,
    durationMs,
    promptTokens: usage?.prompt_tokens ?? null,
    completionTokens: usage?.completion_tokens ?? null,
    sampleBlocks: blocks.slice(0, 6),
  };
}

async function main() {
  const results = [];
  for (const s of scenarios) {
    console.log(`Running: ${s.name}...`);
    try {
      const r = await runScenario(s);
      console.log(`  -> ${r.status}, ${r.blockCount} blocks, ${r.distinctDays} days, ${r.overlaps.length} overlaps, ${r.durationMs}ms`);
      results.push(r);
    } catch (err) {
      console.error(`  -> FAILED:`, err);
      results.push({ name: s.name, scope: s.scope, error: String(err) });
    }
  }
  const out = {
    model: MODEL,
    ranAt: new Date().toISOString(),
    results,
  };
  writeFileSync("../study-flow-web/src/data/gpt5-mini-eval.json", JSON.stringify(out, null, 2));
  console.log("Wrote eval results.");
}

main();
