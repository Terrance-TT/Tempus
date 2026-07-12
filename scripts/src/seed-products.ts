import { getUncachableStripeClient } from "./stripeClient.js";

const COUPON_ID = "tempus-first-month-50off";

async function createProducts() {
  try {
    const stripe = await getUncachableStripeClient();
    console.log("Checking for existing Tempus Pro product...");

    const existing = await stripe.products.search({
      query: "name:'Tempus Pro' AND active:'true'",
    });

    let productId: string;

    if (existing.data.length > 0) {
      console.log("Tempus Pro already exists. Skipping product creation.");
      productId = existing.data[0].id;
      const prices = await stripe.prices.list({ product: productId, active: true });
      for (const p of prices.data) {
        console.log(`  Price: ${p.id} — $${((p.unit_amount ?? 0) / 100).toFixed(2)}/${(p.recurring as any)?.interval ?? "one-time"}`);
      }
    } else {
      const product = await stripe.products.create({
        name: "Tempus Pro",
        description: "Unlimited AI schedule generations, no ads.",
      });
      productId = product.id;
      console.log(`Created product: ${product.name} (${product.id})`);

      const price = await stripe.prices.create({
        product: productId,
        unit_amount: 999,
        currency: "usd",
        recurring: { interval: "month" },
      });
      console.log(`Created price: $9.99/month (${price.id})`);
    }

    // Create or update the first-month-50%-off coupon
    let couponExists = false;
    try {
      const existing = await stripe.coupons.retrieve(COUPON_ID);
      if (existing.valid) {
        console.log(`Coupon '${COUPON_ID}' already exists and is valid.`);
        couponExists = true;
      } else {
        console.log(`Coupon '${COUPON_ID}' exists but is no longer valid.`);
      }
    } catch {
      // Not found — create it
    }

    if (!couponExists) {
      const coupon = await stripe.coupons.create({
        id: COUPON_ID,
        percent_off: 50,
        duration: "once",
        name: "50% off your first month",
        max_redemptions: undefined, // unlimited
      });
      console.log(`Created coupon: ${coupon.name} (${coupon.id})`);
    }

    console.log("\nDone! Run this script once after connecting Stripe.");
    console.log("Webhooks will sync product/price data to your database automatically.");
  } catch (err: any) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

createProducts();
