import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: text("owner_id").notNull().unique(),
  wakeTime: text("wake_time"),
  bedTime: text("bed_time"),
  mealTimes: text("meal_times"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
