# Deploying Tempus to Render

Three Render services: a PostgreSQL database, a Node.js backend (Express API), and a static React frontend.

## Prerequisites

- A [Render](https://render.com) account
- This repo pushed to GitHub or GitLab (Render deploys from Git)
- Your secrets ready (Clerk keys, Google OAuth, Stripe keys)

---

## Option A — Blueprint (render.yaml) — Recommended

Render can read `render.yaml` at the repo root and create all three services in one click.

1. In Render, click **New** → **Blueprint**
2. Connect your GitHub repo — Render finds `render.yaml` automatically
3. Click **Apply** — it creates `tempus-db`, `tempus-api`, and `tempus-web`
4. Fill in the required env vars (marked `sync: false`) — see the tables below
5. After the API service gets its URL, follow **Step 5 (Set FRONTEND_URL)** below

---

## Option B — Manual setup

### Step 1 — Create the database

1. **New** → **PostgreSQL** → name it `tempus-db`, choose the Free plan
2. After it provisions, copy the **Internal Database URL** (used by the API service)

### Step 2 — Create the backend service

1. **New** → **Web Service** → connect your repo
2. Set:
   - **Runtime**: Node
   - **Build command**: `npm install -g pnpm@10 && pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server run build`
   - **Start command**: `node --enable-source-maps ./artifacts/api-server/dist/index.mjs`
   - **Health check path**: `/healthz`
3. Add env vars (see table below)

### Step 3 — Create the frontend service

1. **New** → **Static Site** → connect the same repo
2. Set:
   - **Build command**: `npm install -g pnpm@10 && pnpm install --frozen-lockfile && BASE_PATH=/ PORT=3000 pnpm --filter @workspace/study-flow-web run build`
   - **Publish directory**: `artifacts/study-flow-web/dist/public`
3. Under **Redirects/Rewrites** add a rule: `/*` → `/index.html`, type **Rewrite**
4. Add env vars (see table below)

---

## Environment variables

### Backend (`tempus-api`)

| Variable | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Required |
| `PORT` | `10000` | Required — Render default |
| `DATABASE_URL` | *(from tempus-db → Internal URL)* | Required |
| `FRONTEND_URL` | `https://tempus-web.onrender.com` | Set after Step 5 |
| `CLERK_SECRET_KEY` | *(Clerk dashboard)* | Required |
| `CLERK_PUBLISHABLE_KEY` | *(Clerk dashboard)* | Required |
| `GOOGLE_CLIENT_ID` | *(Google Cloud Console)* | Required for Calendar/Classroom |
| `GOOGLE_CLIENT_SECRET` | *(Google Cloud Console)* | Required for Calendar/Classroom |
| `STRIPE_SECRET_KEY` | *(Stripe dashboard)* | Required for payments |
| `STRIPE_WEBHOOK_SECRET` | *(created automatically on first boot)* | See Stripe note below |

### Frontend (`tempus-web`)

| Variable | Value | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `https://tempus-api.onrender.com` | Set after API service is live |
| `VITE_CLERK_PUBLISHABLE_KEY` | *(Clerk dashboard)* | Required |

---

## Step 5 — Wire the two services together

After the first deploy you know the real URLs. Wire them up:

1. Copy the API service URL (e.g. `https://tempus-api.onrender.com`)
2. In the **frontend** service → Environment → set `VITE_API_BASE_URL` = that URL, then **Manual Deploy**
3. Copy the frontend URL (e.g. `https://tempus-web.onrender.com`)
4. In the **backend** service → Environment → set `FRONTEND_URL` = that URL
   - This ensures Stripe checkout/portal redirect back to the correct domain

---

## Step 6 — Stripe webhook

The API server calls `findOrCreateManagedWebhook` on startup and **auto-registers** the Stripe webhook at:

```
https://tempus-api.onrender.com/api/stripe/webhook
```

After the first successful boot, open your Stripe Dashboard → **Developers** → **Webhooks** to confirm the endpoint was created and copy the **Signing secret** → paste it as `STRIPE_WEBHOOK_SECRET` in the backend env vars, then redeploy.

---

## Step 7 — Clerk configuration

1. [Clerk Dashboard](https://dashboard.clerk.com) → your app → **Domains**
2. Add `https://tempus-web.onrender.com` as an allowed origin
3. Add `https://tempus-api.onrender.com/api/google-calendar/callback` to OAuth allowed callbacks

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Blank frontend | `VITE_API_BASE_URL` missing or wrong | Check env var, trigger manual deploy |
| Stripe checkout redirects to wrong URL | `FRONTEND_URL` not set | Set it in backend env vars |
| Backend won't start | Missing `DATABASE_URL` or `PORT` | Check env vars in Render dashboard |
| Clerk auth fails | Domain not whitelisted | Add Render URLs to Clerk dashboard |
| `PORT` error on Render | Port mismatch | Ensure `PORT=10000` is set |
