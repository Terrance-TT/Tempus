import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// User feedback: quick bug reports and the longer product survey.
// Submissions are readable only by staff admins (see /admin/feedback).
export const feedback = pgTable("feedback", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ownerId: text("owner_id").notNull(),
  email: text("email"),
  type: text("type", { enum: ["bug", "survey"] }).notNull(),
  message: text("message"), // bug reports
  answers: jsonb("answers"), // survey: { question: string, answer: string }[]
  page: text("page"),
  userAgent: text("user_agent"),
  status: text("status", { enum: ["new", "resolved"] }).notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = typeof feedback.$inferInsert;
