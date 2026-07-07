import { db, users } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export class Storage {
  async getProduct(productId: string) {
    try {
      const result = await db.execute(
        sql`SELECT * FROM stripe.products WHERE id = ${productId}`,
      );
      return result.rows[0] ?? null;
    } catch {
      return null;
    }
  }

  async listProductsWithPrices() {
    try {
      const result = await db.execute(sql`
        WITH paginated_products AS (
          SELECT id, name, description, metadata, active
          FROM stripe.products
          WHERE active = true
          ORDER BY id
          LIMIT 20
        )
        SELECT
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.active as product_active,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring,
          pr.active as price_active
        FROM paginated_products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        ORDER BY p.id, pr.unit_amount
      `);
      return result.rows;
    } catch {
      return [];
    }
  }

  async getSubscription(subscriptionId: string) {
    try {
      const result = await db.execute(
        sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`,
      );
      return result.rows[0] ?? null;
    } catch {
      return null;
    }
  }

  async getActiveSubscriptionForCustomer(customerId: string) {
    try {
      const result = await db.execute(
        sql`SELECT * FROM stripe.subscriptions WHERE customer = ${customerId} AND status IN ('active', 'trialing') LIMIT 1`,
      );
      return result.rows[0] ?? null;
    } catch {
      return null;
    }
  }

  async getUser(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  }

  async upsertUser(id: string, email?: string) {
    const [user] = await db
      .insert(users)
      .values({ id, email })
      .onConflictDoUpdate({
        target: users.id,
        set: { email: email ?? sql`users.email` },
      })
      .returning();
    return user;
  }

  async updateUserStripeInfo(
    userId: string,
    info: { stripeCustomerId?: string; stripeSubscriptionId?: string },
  ) {
    const [user] = await db
      .update(users)
      .set(info)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
}

export const storage = new Storage();
