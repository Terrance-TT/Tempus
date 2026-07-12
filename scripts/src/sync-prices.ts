import { getStripeSync } from "./stripeClient.js";

async function main() {
  const sync = await getStripeSync();
  console.log("Syncing products from Stripe...");
  await sync.syncProducts();
  console.log("Syncing prices from Stripe...");
  await sync.syncPrices();
  console.log("Done — stripe.prices table is up to date.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
