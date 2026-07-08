import { pgTable, text, timestamp, uuid, unique } from "drizzle-orm/pg-core";

export const canvasConnections = pgTable("canvas_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: text("owner_id").notNull().unique(),
  baseUrl: text("base_url").notNull(),
  accessToken: text("access_token").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deviceId: text("device_id").notNull(),
    source: text("source").notNull(), // "canvas" | "classroom"
    externalId: text("external_id").notNull(),
    courseName: text("course_name"),
    title: text("title").notNull(),
    dueDate: text("due_date").notNull(), // ISO date or datetime string
    url: text("url"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.deviceId, table.source, table.externalId)],
);
