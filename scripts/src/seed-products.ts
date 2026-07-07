import { getUncachableStripeClient } from "./stripeClient.js";

async function createProducts() {
  try {
    const stripe = await getUncachableStripeClient();
    console.log("Checking for existing StudyFlow Pro product...");

    const existing = await stripe.products.search({
      query: "name:'StudyFlow Pro' AND active:'true'",
    });

    if (existing.data.length > 0) {
      console.log("StudyFlow Pro already exists. Skipping.");
      console.log(`Product ID: ${existing.data[0].id}`);
      const prices = await stripe.prices.list({ product: existing.data[0].id, active: true });
      for (const p of prices.data) {
        console.log(`  Price: ${p.id} — $${((p.unit_amount ?? 0) / 100).toFixed(2)}/${(p.recurring as any)?.interval ?? "one-time"}`);
      }
      return;
    }

    const product = await stripe.products.create({
      name: "StudyFlow Pro",
      description: "Unlimited AI schedule generations, no ads.",
    });
    console.log(`Created product: ${product.name} (${product.id})`);

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 1000,
      currency: "usd",
      recurring: { interval: "month" },
    });
    console.log(`Created price: $10.00/month (${price.id})`);

    console.log("\nDone! Webhooks will sync this to your database automatically.");
  } catch (err: any) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

createProducts();
