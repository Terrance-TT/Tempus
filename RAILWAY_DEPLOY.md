# Deploying Tempus to Railway

This guide deploys Tempus as **three separate Railway services**: a PostgreSQL database, a Node.js backend (Express API), and a static frontend (React + Vite).

## Prerequisites

- A [Railway](https://railway.app) account (free tier available)
- This repo pushed to GitHub (Railway deploys from Git)
- Your Replit secrets copied — you'll need to re-enter them in Railway

---

## Step 1: Create the Database Service

1. In Railway, click **New** → **Database** → **Add PostgreSQL**
2. Wait for it to provision. Click into the service → **Variables** → copy `DATABASE_URL`
3. Save this URL — you'll paste it into the backend service in Step 3

---

## Step 2: Create the Backend Service

1. Click **New** → **Service** → **GitHub Repo** → select your repo
2. In the service settings:
   - **Build Command** (or use `railway.backend.json`): see below
   - **Start Command**: `node --enable-source-maps ./artifacts/api-server/dist/index.mjs`
3. Go to **Variables** and add the following:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | *(paste from Step 1)* | Required — DB connection string |
| `PORT` | `8080` | Required — any port Railway will expose |
| `NODE_ENV` | `production` | Required |
| `CLERK_SECRET_KEY` | *(your Clerk secret)* | Required for auth |
| `CLERK_PUBLISHABLE_KEY` | *(your Clerk publishable key)* | Required for auth |
| `VITE_CLERK_PUBLISHABLE_KEY` | *(same as above)* | Backend uses this too |
| `GOOGLE_CLIENT_ID` | *(your Google OAuth client ID)* | Required for Google Calendar & Classroom |
| `GOOGLE_CLIENT_SECRET` | *(your Google OAuth client secret)* | Required for Google Calendar & Classroom |
| `STRIPE_SECRET_KEY` | *(your Stripe secret key)* | Optional — omit if no payments |
| `STRIPE_WEBHOOK_SECRET` | *(your Stripe webhook secret)* | Optional — omit if no payments |
| `RAILWAY_PUBLIC_DOMAIN` | *(auto-populated by Railway)* | Auto — used for webhook URLs |

4. Go to **Settings** → **Networking** → generate a public domain (e.g. `tempus-api.up.railway.app`)
5. Copy this public domain — you'll need it for the frontend in Step 4

### Backend Build Details

Railway will auto-detect Node.js. The build needs to:
1. Install pnpm + dependencies at the repo root
2. Build the `api-server` artifact

If Railway doesn't auto-detect correctly, use a **Dockerfile** or set custom build commands:

```bash
# Build command
npm install -g pnpm && pnpm install && pnpm --filter @workspace/api-server run build

# Start command
node --enable-source-maps ./artifacts/api-server/dist/index.mjs
```

---

## Step 3: Create the Frontend Service

1. Click **New** → **Service** → **GitHub Repo** → select the same repo
2. In the service settings:
   - **Build Command**: see below
   - **Start Command**: `npx serve artifacts/study-flow-web/dist/public -l ${PORT}`
3. Go to **Variables** and add:

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_API_BASE_URL` | `https://YOUR_BACKEND_DOMAIN` | Required — full backend URL |
| `BASE_PATH` | `/` | Required — root base path for Railway |
| `PORT` | `3000` | Required — any free port |
| `NODE_ENV` | `production` | Required |
| `VITE_CLERK_PUBLISHABLE_KEY` | *(your Clerk publishable key)* | Required for auth |
| `VITE_CLERK_PROXY_URL` | *(empty or your proxy URL)* | Optional — usually empty |

> Replace `YOUR_BACKEND_DOMAIN` with the actual public domain from Step 2 (e.g. `https://tempus-api.up.railway.app`)

### Frontend Build Details

The frontend needs the backend URL at build time so the API client knows where to send requests.

```bash
# Build command
npm install -g pnpm && pnpm install && BASE_PATH=/ PORT=3000 VITE_API_BASE_URL=https://YOUR_BACKEND_DOMAIN pnpm --filter @workspace/study-flow-web run build

# Start command
npx serve artifacts/study-flow-web/dist/public -l ${PORT}
```

4. Go to **Settings** → **Networking** → generate a public domain (e.g. `tempus.up.railway.app`)

---

## Step 4: CORS Configuration

The backend currently assumes same-origin requests. Once frontend and backend are on different domains, the backend needs to allow CORS from the frontend domain.

In `artifacts/api-server/src/app.ts`, update the CORS setup:

```typescript
// Find the CORS middleware and update to allow your frontend domain:
app.use(cors({
  origin: [
    'https://tempus.up.railway.app',   // your frontend domain
    'http://localhost:3000',            // local dev
  ],
  credentials: true,
}));
```

> **Note**: This is a manual step you'll need to do before deploying. If you want, I can add a `CORS_ORIGIN` env var so this is configurable without code changes.

---

## Step 5: Clerk Configuration

1. Go to your [Clerk Dashboard](https://dashboard.clerk.com)
2. Add your Railway frontend domain to **Allowed Origins** (e.g. `https://tempus.up.railway.app`)
3. Add the backend domain to **Allowed Callback URLs** if you use OAuth (e.g. `https://tempus-api.up.railway.app/api/google-calendar/callback`)

---

## Step 6: Deploy

1. Click **Deploy** on each service (or Railway auto-deploys on push)
2. Check the **Logs** tab for each service to verify startup
3. Visit your frontend domain — you should see the Tempus app
4. Test the backend health check: `https://YOUR_BACKEND_DOMAIN/healthz`

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Frontend shows blank page | `VITE_API_BASE_URL` not set or wrong | Check the env var matches the backend domain |
| "Cannot reach API" errors | CORS blocked | Update CORS origin in backend to match frontend domain |
| Backend won't start | Missing `DATABASE_URL` or `PORT` | Check env vars in Railway dashboard |
| Clerk auth fails | Domain not whitelisted | Add Railway domains to Clerk dashboard |
| Database connection fails | Wrong `DATABASE_URL` | Copy the exact URL from the Railway PostgreSQL service |

---

## Costs

- **Railway Free Tier**: ~500 hours/mo of runtime (services sleep after inactivity)
- **Railway Hobby Plan**: ~$5/mo per service that stays awake + ~$1.50/GB for PostgreSQL
- For this 3-service setup (DB + backend + frontend), expect **~$10-15/mo** on Hobby

---

## Alternative: Single-Service Deployment

If you want to save money, you can serve the frontend **from the backend** as static files:

1. Build the frontend: `pnpm --filter @workspace/study-flow-web run build`
2. In the backend, add Express static middleware to serve `artifacts/study-flow-web/dist/public`
3. Deploy only **one service** (backend + frontend combined) + the database

This drops costs to ~$5-7/mo on Hobby. Ask if you want me to set this up instead.
