import { db, users, staffRoles } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripeClient";

/**
 * Returns true if the given Clerk userId has an active (or trialing) Stripe subscription,
 * OR if the user has a staff role (admin/employee), which grants complimentary pro access.
 * Safely returns false if neither condition is met or on any error.
 *
 * Checks in this order:
 *   1. Staff role → instant true
 *   2. stripe.subscriptions synced table (fast, no API call)
 *   3. Stripe API direct lookup (fallback for when webhook hasn't fired yet — e.g.
 *      immediately after checkout, STRIPE_WEBHOOK_SECRET is missing, or sync lag)
 */
export async function checkIsProSubscriber(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  try {
    // 1. Staff/admin members get complimentary pro access.
    const [staffRow] = await db.select().from(staffRoles).where(eq(staffRoles.userId, userId));
    if (staffRow) return true;

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user?.stripeCustomerId) return false;

    // 2. Fast path: check the webhook-synced table.
    const result = await db.execute(
      sql`SELECT status FROM stripe.subscriptions WHERE customer = ${user.stripeCustomerId} AND status IN ('active', 'trialing') LIMIT 1`,
    );
    if (result.rows.length > 0) return true;

    // 3. Fallback: query Stripe API directly. This handles the gap between a
    //    successful checkout and the webhook being delivered + processed
    //    (especially when STRIPE_WEBHOOK_SECRET is not yet configured).
    const stripe = await getUncachableStripeClient();
    const subs = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      limit: 5,
    });
    return subs.data.some((s) => s.status === "active" || s.status === "trialing");
  } catch {
    return false;
  }
}

export const FREE_TIER_SCHEDULE_LIMIT = 2;
