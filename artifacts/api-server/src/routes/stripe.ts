import { Router, type IRouter, type Request } from "express";
import { getAuth } from "@clerk/express";
import { storage } from "../storage";
import { stripeService } from "../stripeService";
import { checkIsProSubscriber, FREE_TIER_SCHEDULE_LIMIT } from "../lib/subscription";
import { db, schedules } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { resolveOwnerId } from "../lib/auth";

const router: IRouter = Router();

/**
 * Returns the frontend base URL for Stripe redirect/return URLs.
 * Priority:
 *   1. FRONTEND_URL env var (explicit — recommended for production)
 *   2. Auto-detect from RAILWAY_PUBLIC_DOMAIN / RENDER_EXTERNAL_HOSTNAME / REPLIT_DOMAINS / request headers
 *      - Appends /study-flow-web only when running on Replit (REPLIT_DOMAINS is set)
 */
function getFrontendBase(req: Request): string {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  const host =
    process.env.RAILWAY_PUBLIC_DOMAIN ??
    process.env.RENDER_EXTERNAL_HOSTNAME ??
    process.env.REPLIT_DOMAINS?.split(",")[0] ??
    req.get("x-forwarded-host") ??
    req.get("host");
  const proto = host?.includes("localhost") ? "http" : "https";
  const suffix = process.env.REPLIT_DOMAINS ? "/study-flow-web" : "";
  return `${proto}://${host}${suffix}`;
}

router.get("/subscription/status", async (req, res) => {
  const deviceId = req.query.deviceId as string | undefined;
  if (!deviceId) {
    res.status(400).json({ error: "deviceId required" });
    return;
  }
  const ownerId = resolveOwnerId(req, deviceId);
  const userId = getAuth(req)?.userId ?? null;

  const isPro = await checkIsProSubscriber(userId);

  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schedules)
    .where(eq(schedules.deviceId, ownerId));

  const scheduleCount = countResult[0]?.count ?? 0;

  res.json({
    isPro,
    scheduleCount,
    scheduleLimit: FREE_TIER_SCHEDULE_LIMIT,
  });
});

router.post("/checkout", async (req, res) => {
  const userId = getAuth(req)?.userId;
  if (!userId) {
    res.status(401).json({ error: "Sign in required to subscribe" });
    return;
  }

  const priceId = req.body?.priceId as string | undefined;
  if (!priceId) {
    res.status(400).json({ error: "priceId required" });
    return;
  }

  let user = await storage.getUser(userId);
  if (!user) {
    user = await storage.upsertUser(userId);
  }

  let customerId = user.stripeCustomerId;
  if (customerId) {
    // Guard against stale customer IDs left over from a previously connected
    // Stripe account — recreate the customer if it no longer exists.
    const exists = await stripeService.customerExists(customerId);
    if (!exists) customerId = null;
  }
  if (!customerId) {
    const customer = await stripeService.createCustomer(user.email ?? "", userId);
    await storage.updateUserStripeInfo(userId, { stripeCustomerId: customer.id });
    customerId = customer.id;
  }

  const appBase = getFrontendBase(req);

  const couponId = await stripeService.resolveIntroCoupon();

  const session = await stripeService.createCheckoutSession(
    customerId,
    priceId,
    `${appBase}/checkout/success`,
    `${appBase}/checkout/cancel`,
    { couponId },
  );

  res.json({ url: session.url });
});

router.post("/customer-portal", async (req, res) => {
  const userId = getAuth(req)?.userId;
  if (!userId) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }

  const user = await storage.getUser(userId);
  if (!user?.stripeCustomerId) {
    res.status(400).json({ error: "No Stripe customer found" });
    return;
  }

  const returnUrl = `${getFrontendBase(req)}/pricing`;

  const portalSession = await stripeService.createCustomerPortalSession(
    user.stripeCustomerId,
    returnUrl,
  );

  res.json({ url: portalSession.url });
});

router.get("/products", async (_req, res) => {
  const rows = await storage.listProductsWithPrices();

  const productsMap = new Map<string, { id: string; name: string; description: string | null; prices: Array<{ id: string; unit_amount: number; currency: string; recurring: unknown }> }>();
  for (const row of rows as any[]) {
    if (!productsMap.has(row.product_id)) {
      productsMap.set(row.product_id, {
        id: row.product_id,
        name: row.product_name,
        description: row.product_description,
        prices: [],
      });
    }
    if (row.price_id) {
      productsMap.get(row.product_id)!.prices.push({
        id: row.price_id,
        unit_amount: row.unit_amount,
        currency: row.currency,
        recurring: row.recurring,
      });
    }
  }

  res.json({ data: Array.from(productsMap.values()) });
});

export default router;
