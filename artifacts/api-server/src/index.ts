import app from "./app";
import { logger } from "./lib/logger";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return;
  try {
    await runMigrations({ databaseUrl });
    const stripeSync = await getStripeSync();
    const publicHost =
      process.env.RAILWAY_PUBLIC_DOMAIN
      ?? process.env.RENDER_EXTERNAL_HOSTNAME
      ?? process.env.REPLIT_DOMAINS?.split(",")[0];
    if (!publicHost) {
      logger.warn("Stripe init skipped — no public host configured");
      return;
    }
    const webhookBaseUrl = `https://${publicHost}`;
    await stripeSync.findOrCreateManagedWebhook(`${webhookBaseUrl}/api/stripe/webhook`);
    stripeSync.syncBackfill().catch((err) => logger.error({ err }, "Stripe backfill error"));
    logger.info("Stripe initialized");
  } catch (err) {
    logger.warn({ err }, "Stripe init skipped — connect Stripe via the Integrations tab to enable payments");
  }
}

await initStripe();

const rawPort = process.env["PORT"] || process.env["RAILWAY_PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, "0.0.0.0", (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
