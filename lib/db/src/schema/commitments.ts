import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const commitments = pgTable("commitments", {
  id: uuid("id").primaryKey().defaultRandom(),
  deviceId: text("device_id").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(), // "class" | "extracurricular" | "routine"
  daysOfWeek: text("days_of_week").array().notNull(), // DayOfWeek[]
  startTime: text("start_time").notNull(), // "HH:mm"
  endTime: text("end_time").notNull(), // "HH:mm"
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
