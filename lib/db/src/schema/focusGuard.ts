import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const DEFAULT_BLOCKED_SITES = [
  "youtube.com",
  "instagram.com",
  "snapchat.com",
  "tiktok.com",
  "x.com",
  "twitter.com",
  "reddit.com",
  "facebook.com",
  "twitch.tv",
  "netflix.com",
  "discord.com",
  "pinterest.com",
];

// Per-user Focus Guard configuration. The Chrome extension is a dumb client:
// every setting lives here and is edited from the website only.
export const focusGuardSettings = pgTable("focus_guard_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: text("owner_id").notNull().unique(),
  blockedSites: jsonb("blocked_sites").notNull().default(DEFAULT_BLOCKED_SITES), // string[] of domains
  blockMode: text("block_mode").notNull().default("work_blocks"), // "work_blocks" | "non_free"
  active: boolean("active").notNull().default(true),
  hideActivateSwitch: boolean("hide_activate_switch").notNull().default(false),
  showClock: boolean("show_clock").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Daily per-domain time spent, reported by the extension (Pro analytics).
export const focusGuardUsage = pgTable(
  "focus_guard_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    domain: text("domain").notNull(),
    day: text("day").notNull(), // YYYY-MM-DD (extension-local date)
    seconds: integer("seconds").notNull().default(0),
  },
  (table) => [uniqueIndex("focus_guard_usage_owner_domain_day").on(table.ownerId, table.domain, table.day)],
);

export type FocusGuardSettings = typeof focusGuardSettings.$inferSelect;
export type FocusGuardUsage = typeof focusGuardUsage.$inferSelect;
