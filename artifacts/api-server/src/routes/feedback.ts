import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { desc, eq, isNotNull, sql } from "drizzle-orm";
import { db, feedback, schedules, staffRoles, users } from "@workspace/db";
import { resolveOwnerId } from "../lib/auth";
import { SubmitFeedbackBody, UpdateFeedbackStatusBody, UpdateFeedbackStatusParams } from "@workspace/api-zod";

const router: IRouter = Router();

const MAX_MESSAGE_LENGTH = 5000;
const MAX_ANSWER_LENGTH = 5000;
const MAX_ANSWERS = 20;
const MAX_BODY_BYTES = 64 * 1024;

// Simple in-memory rate limiter: 10 submissions per 10 minutes per client.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 10;
const submissionLog = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const timestamps = (submissionLog.get(key) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (timestamps.length >= RATE_LIMIT_MAX) {
    submissionLog.set(key, timestamps);
    return true;
  }
  timestamps.push(now);
  submissionLog.set(key, timestamps);
  // Keep the map from growing unbounded.
  if (submissionLog.size > 10000) {
    for (const [k, ts] of submissionLog) {
      if (ts.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) submissionLog.delete(k);
    }
  }
  return false;
}

async function isStaffAdmin(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const [row] = await db.select().from(staffRoles).where(eq(staffRoles.userId, userId)).limit(1);
  return row?.role === "admin";
}

router.post("/feedback", async (req, res) => {
  if (JSON.stringify(req.body ?? {}).length > MAX_BODY_BYTES) {
    res.status(413).json({ message: "Feedback is too large." });
    return;
  }

  const body = SubmitFeedbackBody.parse(req.body);
  const ownerId = resolveOwnerId(req, body.deviceId);

  const clientKey = `${req.ip ?? "unknown"}:${ownerId}`;
  if (isRateLimited(clientKey)) {
    res.status(429).json({ message: "Too many submissions — please try again in a few minutes." });
    return;
  }

  if (body.type === "bug" && !body.message?.trim()) {
    res.status(400).json({ message: "Bug reports need a description." });
    return;
  }
  if (body.type === "survey" && (!body.answers || body.answers.length === 0)) {
    res.status(400).json({ message: "Survey submissions need at least one answer." });
    return;
  }

  // Attach the submitter's email when signed in, so the admin can follow up.
  const auth = getAuth(req);
  let email: string | null = null;
  if (auth?.userId) {
    const [user] = await db.select().from(users).where(eq(users.id, auth.userId)).limit(1);
    email = user?.email ?? null;
  }

  const answers = body.answers
    ?.slice(0, MAX_ANSWERS)
    .map((a) => ({
      question: String(a.question).slice(0, 500),
      answer: String(a.answer).slice(0, MAX_ANSWER_LENGTH),
    }))
    .filter((a) => a.answer.trim().length > 0);

  await db.insert(feedback).values({
    ownerId,
    email,
    type: body.type,
    message: body.message?.trim().slice(0, MAX_MESSAGE_LENGTH) ?? null,
    answers: answers && answers.length > 0 ? answers : null,
    page: body.page?.slice(0, 500) ?? null,
    userAgent: req.headers["user-agent"]?.slice(0, 500) ?? null,
  });

  res.json({ ok: true });
});

router.get("/admin/status", async (req, res) => {
  const auth = getAuth(req);
  res.json({ isAdmin: await isStaffAdmin(auth?.userId ?? null) });
});

router.get("/admin/stats", async (req, res) => {
  const auth = getAuth(req);
  if (!(await isStaffAdmin(auth?.userId ?? null))) {
    res.status(403).json({ message: "Admin access required." });
    return;
  }

  const [[userCountRow], [returningRow], [genStatsRow]] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(users),
    db.execute<{ count: number }>(sql`
      select count(*)::int as count from (
        select ${schedules.deviceId} as device_id
        from ${schedules}
        group by ${schedules.deviceId}
        having count(distinct date_trunc('day', ${schedules.createdAt})) > 1
      ) as returning_devices
    `).then((result) => result.rows as { count: number }[]),
    db
      .select({
        avgMs: sql<number | null>`avg(${schedules.generationDurationMs})`,
        total: sql<number>`count(*)::int`,
      })
      .from(schedules)
      .where(isNotNull(schedules.generationDurationMs)),
  ]);

  res.json({
    totalUsers: userCountRow?.count ?? 0,
    returningUsers: returningRow?.count ?? 0,
    averageGenerationTimeMs:
      genStatsRow?.avgMs != null ? Number(genStatsRow.avgMs) : null,
    totalSchedulesGenerated: genStatsRow?.total ?? 0,
  });
});

router.get("/admin/feedback", async (req, res) => {
  const auth = getAuth(req);
  if (!(await isStaffAdmin(auth?.userId ?? null))) {
    res.status(403).json({ message: "Admin access required." });
    return;
  }

  const rows = await db.select().from(feedback).orderBy(desc(feedback.createdAt)).limit(500);
  res.json(
    rows.map((row) => ({
      id: row.id,
      email: row.email,
      type: row.type,
      message: row.message,
      answers: row.answers,
      page: row.page,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    })),
  );
});

router.put("/admin/feedback/:id/status", async (req, res) => {
  const auth = getAuth(req);
  if (!(await isStaffAdmin(auth?.userId ?? null))) {
    res.status(403).json({ message: "Admin access required." });
    return;
  }

  const { id } = UpdateFeedbackStatusParams.parse(req.params);
  const { status } = UpdateFeedbackStatusBody.parse(req.body);

  const [row] = await db
    .update(feedback)
    .set({ status })
    .where(eq(feedback.id, id))
    .returning();

  if (!row) {
    res.status(404).json({ message: "Feedback not found." });
    return;
  }

  res.json({
    id: row.id,
    email: row.email,
    type: row.type,
    message: row.message,
    answers: row.answers,
    page: row.page,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  });
});

export default router;
