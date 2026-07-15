import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import { WebhookHandlers } from "./webhookHandlers";

const app: Express = express();

// Trust proxy headers when behind Render/Railway load balancer
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", true);
}

// CORS — restrict to known origins in production, allow all in dev
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : process.env.NODE_ENV === "production"
    ? []
    : ["*"];

app.use(
  cors({
    credentials: true,
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  }),
);

// HTTP request logging
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Clerk Frontend API proxy — must be BEFORE express.json()
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// Stripe webhook — must be BEFORE express.json() (needs raw Buffer body)
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature" });
      return;
    }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (err: any) {
      logger.error({ err }, "Stripe webhook error");
      res.status(400).json({ error: "Webhook processing error" });
    }
  },
);

// Body parsing
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Clerk session detection
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

// Root health check for Render/Railway
app.get("/", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api", router);

// 404 handler for unmatched API routes
app.use("/api/*", (_req, res) => {
  res.status(404).json({ error: "Not found", path: _req.originalUrl });
});

// Global error handler — no stack traces in production
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const isProduction = process.env.NODE_ENV === "production";
  const statusCode = err.statusCode || err.status || 500;

  logger.error(
    { err: isProduction ? err.message : err },
    "Unhandled error",
  );

  res.status(statusCode).json({
    error: err.message || "Internal server error",
    ...(isProduction ? {} : { stack: err.stack }),
  });
});

export default app;
