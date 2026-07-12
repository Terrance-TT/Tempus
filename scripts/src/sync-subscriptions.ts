import { getStripeSync } from "./stripeClient.js";

async function main() {
  const sync = await getStripeSync();
  console.log("Syncing customers...");
  await sync.syncCustomers();
  console.log("Syncing subscriptions...");
  await sync.syncSubscriptions();
  console.log("Done — stripe.subscriptions table is up to date.");
  process.exit(0);
}

main().catch(err => { console.error(err.message); process.exit(1); });
