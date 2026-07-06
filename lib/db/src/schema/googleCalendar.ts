import { pgTable, text, timestamp, uuid, unique } from "drizzle-orm/pg-core";

export const googleCalendarConnections = pgTable(
  "google_calendar_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull().unique(), // Clerk userId (web-only feature)
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const scheduleCalendarSyncs = pgTable(
  "schedule_calendar_syncs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scheduleId: uuid("schedule_id").notNull(),
    blockId: text("block_id").notNull(),
    googleEventId: text("google_event_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.scheduleId, table.blockId)],
);
