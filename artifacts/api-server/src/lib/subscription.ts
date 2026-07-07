import { db, users, staffRoles } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

/**
 * Returns true if the given Clerk userId has an active (or trialing) Stripe subscription,
 * OR if the user has a staff role (admin/employee), which grants complimentary pro access.
 * Safely returns false if neither condition is met or on any error.
 */
export async function checkIsProSubscriber(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  try {
    // Staff/admin members get complimentary pro access.
    const [staffRow] = await db.select().from(staffRoles).where(eq(staffRoles.userId, userId));
    if (staffRow) return true;

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user?.stripeCustomerId) return false;

    const result = await db.execute(
      sql`SELECT status FROM stripe.subscriptions WHERE customer = ${user.stripeCustomerId} AND status IN ('active', 'trialing') LIMIT 1`,
    );
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

export const FREE_TIER_SCHEDULE_LIMIT = 2;
