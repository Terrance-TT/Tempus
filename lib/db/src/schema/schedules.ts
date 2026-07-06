import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const schedules = pgTable("schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  deviceId: text("device_id").notNull(),
  scope: text("scope").notNull(), // "day" | "week"
  status: text("status").notNull(), // "needs_clarification" | "complete"
  blocks: jsonb("blocks").notNull().default([]), // ScheduleBlock[]
  clarifyingQuestions: jsonb("clarifying_questions").notNull().default([]), // string[]
  answers: jsonb("answers").notNull().default([]), // ClarificationAnswer[] collected so far
  commitmentsSnapshot: jsonb("commitments_snapshot").notNull().default([]), // Commitment[] used to generate
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
