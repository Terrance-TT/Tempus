import { pgTable, text, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";

export const manualRequests = pgTable("manual_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  ownerEmail: text("owner_email"),
  timetableDescription: text("timetable_description"),
  assignments: jsonb("assignments"),
  preferences: jsonb("preferences"),
  status: text("status", { enum: ["pending", "in_progress", "completed", "cancelled"] })
    .notNull()
    .default("pending"),
  assignedToUserId: text("assigned_to_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const manualResponses = pgTable("manual_responses", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").notNull(),
  employeeUserId: text("employee_user_id").notNull(),
  message: text("message"),
  scheduleContent: text("schedule_content"),
  graphicPath: text("graphic_path"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export type ManualRequest = typeof manualRequests.$inferSelect;
export type InsertManualRequest = typeof manualRequests.$inferInsert;
export type ManualResponse = typeof manualResponses.$inferSelect;
export type InsertManualResponse = typeof manualResponses.$inferInsert;
