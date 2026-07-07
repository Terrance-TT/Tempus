import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const staffRoles = pgTable("staff_roles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  email: text("email").notNull(),
  role: text("role", { enum: ["admin", "employee"] }).notNull().default("employee"),
  grantedBy: text("granted_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type StaffRole = typeof staffRoles.$inferSelect;
export type InsertStaffRole = typeof staffRoles.$inferInsert;
