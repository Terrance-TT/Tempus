import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db, commitments, schedules, googleCalendarConnections, scheduleCalendarSyncs } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { resolveOwnerId } from "../lib/auth";
import {
  getValidAccessToken,
  deleteCalendarEvent,
  GoogleReauthRequiredError,
} from "../lib/googleCalendar";
import {
  ListSchedulesQueryParams,
  GetScheduleParams,
  GetScheduleQueryParams,
  DeleteScheduleParams,
  DeleteScheduleQueryParams,
  GenerateScheduleBody,
  UpdateScheduleParams,
  UpdateScheduleBody,
  ReviseScheduleParams,
  ReviseScheduleBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

type ScheduleBlock = {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  title: string;
  category: string;
  notes?: string | null;
};

type CommitmentSnapshot = {
  title: string;
  type: string;
  daysOfWeek: string[];
  startTime: string;
  endTime: string;
  notes?: string | null;
};

type ClarificationAnswer = { question: string; answer: string };

type Task = {
  title: string;
  dueDate: string;
  estimatedMinutes?: number | null;
  notes?: string | null;
};

function serializeSchedule(row: typeof schedules.$inferSelect) {
  return {
    id: row.id,
    deviceId: row.deviceId,
    scope: row.scope,
    status: row.status,
    blocks: row.blocks as ScheduleBlock[],
    clarifyingQuestions: row.clarifyingQuestions as string[],
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Finds and deletes Google Calendar events for any blocks that were removed
 * from a schedule. This is called during PATCH (edit/revise) and DELETE
 * so that deleting a block immediately cleans up its calendar event, not
 * just on the next full sync.
 */
async function deleteRemovedBlockEvents(
  scheduleId: string,
  currentBlockIds: Set<string>,
  userId: string,
): Promise<void> {
  const [connection] = await db
    .select()
    .from(googleCalendarConnections)
    .where(eq(googleCalendarConnections.ownerId, userId));
  if (!connection) return;

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(connection);
  } catch (err) {
    if (err instanceof GoogleReauthRequiredError) {
      await db
        .delete(googleCalendarConnections)
        .where(eq(googleCalendarConnections.id, connection.id));
    }
    return;
  }

  const syncs = await db
    .select()
    .from(scheduleCalendarSyncs)
    .where(eq(scheduleCalendarSyncs.scheduleId, scheduleId));

  for (const sync of syncs) {
    if (!currentBlockIds.has(sync.blockId)) {
      try {
        await deleteCalendarEvent(accessToken, sync.googleEventId);
      } catch (err) {
        // Log but don't block the schedule update if the event is already gone
        console.warn("Failed to delete calendar event for removed block", sync.blockId, err);
      }
      await db
        .delete(scheduleCalendarSyncs)
        .where(eq(scheduleCalendarSyncs.id, sync.id));
    }
  }
}

const generationResultSchema = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["needs_clarification", "complete"],
    },
    questions: {
      type: "array",
      items: { type: "string" },
      description:
        "Clarifying questions to ask the student, only when status is needs_clarification",
    },
    blocks: {
      type: "array",
      description:
        "Full schedule blocks, only when status is complete. Should cover every day requested, filling gaps between commitments with homework, breaks, meals, and free time.",
      items: {
        type: "object",
        properties: {
          day: {
            type: "string",
            enum: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
          },
          startTime: { type: "string", description: "24h HH:mm" },
          endTime: { type: "string", description: "24h HH:mm" },
          title: { type: "string" },
          category: {
            type: "string",
            enum: [
              "class",
              "extracurricular",
              "routine",
              "homework",
              "break",
              "free",
            ],
          },
          notes: { type: ["string", "null"] },
        },
        required: [
          "day",
          "startTime",
          "endTime",
          "title",
          "category",
          "notes",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["status", "questions", "blocks"],
  additionalProperties: false,
} as const;

async function runScheduleGeneration(
  scope: "day" | "week",
  commitmentsSnapshot: CommitmentSnapshot[],
  answers: ClarificationAnswer[],
  tasks: Task[],
): Promise<{
  status: "needs_clarification" | "complete";
  questions: string[];
  blocks: ScheduleBlock[];
}> {
  const systemPrompt = `You are an expert student schedule planner. Given a student's recurring commitments (classes, extracurriculars, personal routines like meals/sleep) and a list of assignments/tasks they need to complete, produce a realistic, well-balanced ${scope === "day" ? "single day" : "full week (mon-sun)"} schedule.

Rules:
- Never overlap two blocks on the same day.
- Keep all of the student's fixed commitments in place at their given times.
- Create dedicated homework/study blocks for the provided tasks. Prioritize tasks by their due date (soonest first) and allocate roughly the estimated time when provided. Title these blocks after the task (e.g. "Work on Biology essay").
- Fill remaining gaps between fixed commitments with sensible additions: breaks, meals, and free time, respecting existing routines (e.g. don't schedule homework during dinner).
- The student may have already provided their preferences (wake-up time, bedtime, meal times, and extra notes) in priorAnswers. Respect them: never schedule anything before wake-up or after bedtime, and place meals at the given times.
- If a preference is missing, use sensible student defaults (wake 7:00, bed 22:30, breakfast/lunch/dinner at typical times) rather than asking. Only set status to "needs_clarification" (with 1-4 short, specific questions) as a last resort when the schedule genuinely cannot be built sensibly without an answer. Do not ask about things already covered by existing commitments, tasks, or prior answers.
- Only produce status "complete" with full "blocks" once you have enough information to build a sensible schedule.
- Keep block titles short and student-friendly (e.g. "Dinner", "Math homework", "Free time").
- "blocks" must be empty when status is "needs_clarification", and "questions" must be empty when status is "complete".`;

  const userPrompt = JSON.stringify({
    scope,
    commitments: commitmentsSnapshot,
    tasks,
    priorAnswers: answers,
  });

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 4096,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "schedule_generation_result",
        strict: true,
        schema: generationResultSchema,
      },
    },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("No content returned from schedule generation model");
  }

  const parsed = JSON.parse(raw) as {
    status: "needs_clarification" | "complete";
    questions: string[];
    blocks: Array<Omit<ScheduleBlock, "id">>;
  };

  return {
    status: parsed.status,
    questions: parsed.questions ?? [],
    blocks: (parsed.blocks ?? []).map((block) => ({
      id: randomUUID(),
      ...block,
    })),
  };
}

const revisionResultSchema = {
  type: "object",
  properties: {
    blocks: generationResultSchema.properties.blocks,
  },
  required: ["blocks"],
  additionalProperties: false,
} as const;

async function runScheduleRevision(
  scope: "day" | "week",
  commitmentsSnapshot: CommitmentSnapshot[],
  tasks: Task[],
  currentBlocks: ScheduleBlock[],
  instruction: string,
): Promise<ScheduleBlock[]> {
  const systemPrompt = `You are an expert student schedule planner revising an EXISTING ${scope === "day" ? "single day" : "full week (mon-sun)"} schedule based on the student's request.

Rules:
- Apply the requested change while keeping the rest of the schedule intact as much as possible.
- Never overlap two blocks on the same day.
- Keep the student's fixed commitments in place unless the instruction explicitly asks to move them.
- Return the COMPLETE updated set of blocks (not just the changed ones).
- Keep block titles short and student-friendly.`;

  const userPrompt = JSON.stringify({
    scope,
    commitments: commitmentsSnapshot,
    tasks,
    currentSchedule: currentBlocks.map(({ id: _id, ...rest }) => rest),
    instruction,
  });

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 4096,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "schedule_revision_result",
        strict: true,
        schema: revisionResultSchema,
      },
    },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("No content returned from schedule revision model");
  }

  const parsed = JSON.parse(raw) as {
    blocks: Array<Omit<ScheduleBlock, "id">>;
  };

  return (parsed.blocks ?? []).map((block) => ({
    id: randomUUID(),
    ...block,
  }));
}

router.get("/schedules", async (req, res) => {
  const { deviceId } = ListSchedulesQueryParams.parse(req.query);
  const ownerId = resolveOwnerId(req, deviceId);
  const rows = await db
    .select()
    .from(schedules)
    .where(eq(schedules.deviceId, ownerId))
    .orderBy(desc(schedules.createdAt));
  res.json(
    rows.map((row) => ({
      id: row.id,
      deviceId: row.deviceId,
      scope: row.scope,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    })),
  );
});

router.get("/schedules/:id", async (req, res) => {
  const { id } = GetScheduleParams.parse(req.params);
  const { deviceId } = GetScheduleQueryParams.parse(req.query);
  const ownerId = resolveOwnerId(req, deviceId);
  const [row] = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.id, id), eq(schedules.deviceId, ownerId)));
  if (!row) {
    res.status(404).json({ message: "Schedule not found" });
    return;
  }
  res.json(serializeSchedule(row));
});

router.patch("/schedules/:id", async (req, res) => {
  const { id } = UpdateScheduleParams.parse(req.params);
  const body = UpdateScheduleBody.parse(req.body);
  const ownerId = resolveOwnerId(req, body.deviceId);

  const [existing] = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.id, id), eq(schedules.deviceId, ownerId)));
  if (!existing) {
    res.status(404).json({ message: "Schedule not found" });
    return;
  }

  const blocks: ScheduleBlock[] = body.blocks.map((block) => ({
    id: block.id || randomUUID(),
    day: block.day,
    startTime: block.startTime,
    endTime: block.endTime,
    title: block.title,
    category: block.category,
    notes: block.notes ?? null,
  }));

  const userId = getAuth(req)?.userId;
  if (userId) {
    await deleteRemovedBlockEvents(id, new Set(blocks.map((b) => b.id)), userId);
  }

  const [updated] = await db
    .update(schedules)
    .set({ blocks, status: "complete", clarifyingQuestions: [] })
    .where(and(eq(schedules.id, id), eq(schedules.deviceId, ownerId)))
    .returning();

  res.json(serializeSchedule(updated));
});

router.delete("/schedules/:id", async (req, res) => {
  const { id } = DeleteScheduleParams.parse(req.params);
  const { deviceId } = DeleteScheduleQueryParams.parse(req.query);
  const ownerId = resolveOwnerId(req, deviceId);
  const [existing] = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.id, id), eq(schedules.deviceId, ownerId)));
  if (!existing) {
    res.status(404).json({ message: "Schedule not found" });
    return;
  }

  const userId = getAuth(req)?.userId;
  if (userId) {
    // Delete all Google Calendar events for this schedule before removing the schedule.
    await deleteRemovedBlockEvents(id, new Set(), userId);
  }

  await db
    .delete(schedules)
    .where(and(eq(schedules.id, id), eq(schedules.deviceId, ownerId)));
  res.status(204).end();
});

router.post("/schedules/:id/revise", async (req, res) => {
  const { id } = ReviseScheduleParams.parse(req.params);
  const body = ReviseScheduleBody.parse(req.body);
  const ownerId = resolveOwnerId(req, body.deviceId);

  const [existing] = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.id, id), eq(schedules.deviceId, ownerId)));
  if (!existing) {
    res.status(404).json({ message: "Schedule not found" });
    return;
  }

  const revised = await runScheduleRevision(
    existing.scope as "day" | "week",
    existing.commitmentsSnapshot as CommitmentSnapshot[],
    (existing.tasks as Task[]) ?? [],
    existing.blocks as ScheduleBlock[],
    body.instruction,
  );

  const userId = getAuth(req)?.userId;
  if (userId) {
    await deleteRemovedBlockEvents(id, new Set(revised.map((b) => b.id)), userId);
  }

  const [updated] = await db
    .update(schedules)
    .set({ blocks: revised, status: "complete", clarifyingQuestions: [] })
    .where(and(eq(schedules.id, id), eq(schedules.deviceId, ownerId)))
    .returning();

  res.json(serializeSchedule(updated));
});

router.post("/schedules/generate", async (req, res) => {
  const body = GenerateScheduleBody.parse(req.body);
  const ownerId = resolveOwnerId(req, body.deviceId);

  let commitmentsSnapshot: CommitmentSnapshot[];
  let priorAnswers: ClarificationAnswer[];
  let taskList: Task[];
  let draftRow: typeof schedules.$inferSelect | undefined;

  if (body.draftId) {
    const [existing] = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.id, body.draftId),
          eq(schedules.deviceId, ownerId),
        ),
      );
    if (!existing) {
      res.status(404).json({ message: "Draft schedule not found" });
      return;
    }
    draftRow = existing;
    commitmentsSnapshot = existing.commitmentsSnapshot as CommitmentSnapshot[];
    taskList = (existing.tasks as Task[]) ?? [];
    priorAnswers = [
      ...(existing.answers as ClarificationAnswer[]),
      ...(body.answers ?? []),
    ];
  } else {
    const rows = await db
      .select()
      .from(commitments)
      .where(eq(commitments.deviceId, ownerId));
    commitmentsSnapshot = rows.map((row) => ({
      title: row.title,
      type: row.type,
      daysOfWeek: row.daysOfWeek,
      startTime: row.startTime,
      endTime: row.endTime,
      notes: row.notes,
    }));
    taskList = (body.tasks as Task[] | undefined) ?? [];
    priorAnswers = body.answers ?? [];

    // Fold structured preferences into the persisted prior answers so drafts
    // and clarification follow-ups keep using them without re-submission.
    const prefs = body.preferences;
    if (prefs) {
      const prefAnswers: ClarificationAnswer[] = [];
      if (prefs.wakeTime) {
        prefAnswers.push({
          question: "What time do you usually wake up?",
          answer: prefs.wakeTime,
        });
      }
      if (prefs.bedTime) {
        prefAnswers.push({
          question: "What time do you usually go to bed?",
          answer: prefs.bedTime,
        });
      }
      if (prefs.mealTimes) {
        prefAnswers.push({
          question: "When do you usually eat your meals?",
          answer: prefs.mealTimes,
        });
      }
      if (prefs.notes) {
        prefAnswers.push({
          question: "Anything else to keep in mind for your schedule?",
          answer: prefs.notes,
        });
      }
      priorAnswers = [...prefAnswers, ...priorAnswers];
    }
  }

  const effectiveScope = draftRow
    ? (draftRow.scope as "day" | "week")
    : body.scope;

  const result = await runScheduleGeneration(
    effectiveScope,
    commitmentsSnapshot,
    priorAnswers,
    taskList,
  );

  if (draftRow) {
    const [updated] = await db
      .update(schedules)
      .set({
        status: result.status,
        blocks: result.blocks,
        clarifyingQuestions: result.questions,
        answers: priorAnswers,
      })
      .where(eq(schedules.id, draftRow.id))
      .returning();

    res.json({
      id: updated.id,
      status: updated.status,
      questions:
        updated.status === "needs_clarification"
          ? (updated.clarifyingQuestions as string[])
          : undefined,
      schedule:
        updated.status === "complete" ? serializeSchedule(updated) : undefined,
    });
    return;
  }

  const [created] = await db
    .insert(schedules)
    .values({
      deviceId: ownerId,
      scope: body.scope,
      status: result.status,
      blocks: result.blocks,
      clarifyingQuestions: result.questions,
      answers: priorAnswers,
      tasks: taskList,
      commitmentsSnapshot,
    })
    .returning();

  res.json({
    id: created.id,
    status: created.status,
    questions:
      created.status === "needs_clarification"
        ? (created.clarifyingQuestions as string[])
        : undefined,
    schedule:
      created.status === "complete" ? serializeSchedule(created) : undefined,
  });
});

export default router;
