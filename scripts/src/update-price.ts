import { getUncachableStripeClient } from "./stripeClient.js";

async function updatePrice() {
  const stripe = await getUncachableStripeClient();

  console.log("Looking up Tempus Pro product...");
  const existing = await stripe.products.search({
    query: "name:'Tempus Pro' AND active:'true'",
  });

  if (existing.data.length === 0) {
    console.error("No active Tempus Pro product found. Run seed-products first.");
    process.exit(1);
  }

  const productId = existing.data[0].id;
  console.log(`Product: ${productId}`);

  const activePrices = await stripe.prices.list({ product: productId, active: true });
  console.log(`Active prices: ${activePrices.data.map(p => `${p.id} $${((p.unit_amount ?? 0) / 100).toFixed(2)}`).join(", ")}`);

  const alreadyHas999 = activePrices.data.some((p) => p.unit_amount === 999);
  let newPriceId: string;

  if (alreadyHas999) {
    newPriceId = activePrices.data.find((p) => p.unit_amount === 999)!.id;
    console.log(`$9.99 price already exists: ${newPriceId}`);
  } else {
    const newPrice = await stripe.prices.create({
      product: productId,
      unit_amount: 999,
      currency: "usd",
      recurring: { interval: "month" },
    });
    newPriceId = newPrice.id;
    console.log(`Created new $9.99/month price: ${newPriceId}`);
  }

  await stripe.products.update(productId, { default_price: newPriceId });
  console.log(`Set ${newPriceId} as default price.`);

  for (const oldPrice of activePrices.data) {
    if (oldPrice.unit_amount !== 999) {
      await stripe.prices.update(oldPrice.id, { active: false });
      console.log(`Archived old price ${oldPrice.id} ($${((oldPrice.unit_amount ?? 0) / 100).toFixed(2)}/mo)`);
    }
  }

  console.log("\nDone. The Stripe connector will sync the new price to the database shortly.");
  console.log(`New price ID: ${newPriceId}`);
}

updatePrice().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
