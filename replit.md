# Tempus / Study Flow

A productivity suite with a full-stack monorepo: Express API, React web app, Expo mobile app, and a browser extension for focus/study session management.

## Run & Operate

- `API Server` workflow — runs the API server on port 8080 (`pnpm --filter @workspace/api-server run dev`)
- `Study Flow Web` workflow — runs the React web app on port 5173 (`pnpm --filter @workspace/study-flow-web run dev`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, port 8080 in dev
- Web: React 19 + Vite, port 5173 in dev (BASE_PATH=/)
- Mobile: Expo (React Native) — in `artifacts/tempus-mobile/`
- Browser extension — in `tools/tempus-focus-extension/`
- DB: PostgreSQL + Drizzle ORM
- Auth: Clerk
- Payments: Stripe (via stripe-replit-sync)
- AI: OpenAI via Replit AI Integrations proxy

## Where things live

- `artifacts/api-server/` — Express API server
- `artifacts/study-flow-web/` — React + Vite web frontend
- `artifacts/tempus-mobile/` — Expo mobile app
- `tools/tempus-focus-extension/` — browser extension
- `lib/db/` — Drizzle schema (source of truth for DB schema)
- `lib/api-spec/` — OpenAPI spec (source of truth for API contracts)
- `lib/api-zod/` — generated Zod schemas from OpenAPI spec
- `lib/integrations-openai-ai-server/` — OpenAI server client

## Architecture decisions

- Vite dev server proxies `/api/*` to the API server at `http://localhost:8080`
- API calls from the web app use relative paths (`/api/...`); `VITE_API_BASE_URL` can override
- `pnpm manage-package-manager-versions=false` is set in `.npmrc` to prevent corepack from auto-upgrading pnpm on Replit
- Stripe init is non-fatal on startup — if Stripe schema tables don't exist, a warning is logged and the server continues
- Drizzle schema push is required before first run: `pnpm --filter @workspace/db run push`

## Required secrets

- `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` — Clerk authentication
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google Calendar integration
- `STRIPE_SECRET_KEY` — Stripe billing (optional; Stripe init is gracefully skipped if missing schema)
- `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL` — OpenAI via Replit AI Integrations (auto-provisioned)

## Gotchas

- **pnpm version**: `packageManager` field in `package.json` is pinned to `pnpm@10.13.1`, but Replit has `10.26.1`. The `.npmrc` setting `manage-package-manager-versions=false` prevents pnpm from trying to self-upgrade (which hangs). Do not remove this setting.
- **Corepack**: Run `corepack disable` if pnpm commands hang; corepack can intercept the binary and attempt a network download.
- **Artifacts not registered**: The artifact directories (`artifacts/api-server`, `artifacts/study-flow-web`, etc.) have `artifact.toml` files from the original repo but are not registered in Replit's artifact system. Workflows are configured manually.
- **Stripe schema**: The `stripe.accounts` relation is managed by `stripe-replit-sync`; the missing-table error on startup is logged as a warning and is non-blocking.
- **DB schema**: Always run `pnpm --filter @workspace/db run push` after changing `lib/db/src/schema/`.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
