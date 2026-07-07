import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const extensionTokens = pgTable("extension_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull().unique(),
  ownerId: text("owner_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ExtensionToken = typeof extensionTokens.$inferSelect;
