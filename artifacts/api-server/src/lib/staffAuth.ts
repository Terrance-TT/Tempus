import { type Request, type Response, type NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db } from "@workspace/db";
import { staffRoles } from "@workspace/db";
import { eq } from "drizzle-orm";

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAIL ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function getUserRole(
  userId: string | null,
): Promise<"admin" | "employee" | null> {
  if (!userId) return null;

  // Check against ADMIN_EMAIL env var first
  const client = await clerkClient();
  try {
    const user = await client.users.getUser(userId);
    const email =
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
        ?.emailAddress ?? "";
    if (getAdminEmails().includes(email.toLowerCase())) return "admin";
  } catch {
    // ignore clerk errors, fall through to DB check
  }

  const row = await db
    .select()
    .from(staffRoles)
    .where(eq(staffRoles.userId, userId))
    .limit(1);
  if (!row[0]) return null;
  return row[0].role as "admin" | "employee";
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  getUserRole(userId).then((role) => {
    if (role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}

export function requireStaff(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  getUserRole(userId).then((role) => {
    if (!role) {
      res.status(403).json({ error: "Staff access required" });
      return;
    }
    next();
  });
}
