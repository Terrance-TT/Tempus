import { getUncachableStripeClient } from "./stripeClient.js";

async function main() {
  const stripe = await getUncachableStripeClient();

  const sessions = await stripe.checkout.sessions.list({ limit: 5 });
  for (const s of sessions.data) {
    console.log(`\nsession ${s.id}`);
    console.log(`  status:      ${s.status}`);
    console.log(`  created:     ${new Date(s.created * 1000).toISOString()}`);
    console.log(`  success_url: ${s.success_url}`);
    console.log(`  customer:    ${s.customer}`);
    console.log(`  subscription: ${s.subscription}`);
  }

  const subs = await stripe.subscriptions.list({ limit: 5, status: "all" });
  console.log("\n--- subscriptions ---");
  for (const sub of subs.data) {
    console.log(`${sub.id}  status:${sub.status}  trial_end:${sub.trial_end ? new Date(sub.trial_end*1000).toISOString() : "none"}`);
  }

  process.exit(0);
}

main().catch(err => { console.error(err.message); process.exit(1); });
