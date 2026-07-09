import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { desc, eq, gte, and, sql } from "drizzle-orm";
import { db, focusGuardSettings, focusGuardUsage, DEFAULT_BLOCKED_SITES } from "@workspace/db";
import { resolveOwnerId } from "../lib/auth";
import { checkIsProSubscriber } from "../lib/subscription";
import { GetFocusGuardSettingsQueryParams, UpdateFocusGuardSettingsBody, GetFocusGuardAnalyticsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

const MAX_SITES = 100;
const MAX_DOMAIN_LENGTH = 253;

export function normalizeDomain(input: string): string | null {
  const domain = String(input)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "");
  if (!domain || domain.length > MAX_DOMAIN_LENGTH) return null;
  // Require something.tld shape; reject spaces and invalid chars.
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)) return null;
  return domain;
}

function toSettingsResponse(row: {
  blockedSites: unknown;
  blockMode: string;
  active: boolean;
  hideActivateSwitch: boolean;
  showClock: boolean;
}) {
  return {
    blockedSites: Array.isArray(row.blockedSites) ? row.blockedSites : DEFAULT_BLOCKED_SITES,
    blockMode: row.blockMode === "non_free" ? "non_free" : "work_blocks",
    active: row.active,
    hideActivateSwitch: row.hideActivateSwitch,
    showClock: row.showClock,
  };
}

const DEFAULTS = {
  blockedSites: DEFAULT_BLOCKED_SITES,
  blockMode: "work_blocks" as const,
  active: true,
  hideActivateSwitch: false,
  showClock: true,
};

/** Load settings for an owner, falling back to defaults without creating a row. */
export async function loadFocusGuardSettings(ownerId: string) {
  const [row] = await db
    .select()
    .from(focusGuardSettings)
    .where(eq(focusGuardSettings.ownerId, ownerId))
    .limit(1);
  return row ? toSettingsResponse(row) : { ...DEFAULTS };
}

router.get("/focus-guard/settings", async (req, res) => {
  const { deviceId } = GetFocusGuardSettingsQueryParams.parse(req.query);
  const ownerId = resolveOwnerId(req, deviceId);
  res.json(await loadFocusGuardSettings(ownerId));
});

router.put("/focus-guard/settings", async (req, res) => {
  const body = UpdateFocusGuardSettingsBody.parse(req.body);
  const ownerId = resolveOwnerId(req, body.deviceId);

  let blockedSites: string[] | undefined;
  if (body.blockedSites) {
    const normalized = body.blockedSites
      .map(normalizeDomain)
      .filter((d): d is string => d !== null);
    blockedSites = [...new Set(normalized)].slice(0, MAX_SITES);
  }

  const [existing] = await db
    .select()
    .from(focusGuardSettings)
    .where(eq(focusGuardSettings.ownerId, ownerId))
    .limit(1);

  const merged = {
    blockedSites: blockedSites ?? (existing ? (existing.blockedSites as string[]) : DEFAULTS.blockedSites),
    blockMode: body.blockMode ?? existing?.blockMode ?? DEFAULTS.blockMode,
    active: body.active ?? existing?.active ?? DEFAULTS.active,
    hideActivateSwitch: body.hideActivateSwitch ?? existing?.hideActivateSwitch ?? DEFAULTS.hideActivateSwitch,
    showClock: body.showClock ?? existing?.showClock ?? DEFAULTS.showClock,
    updatedAt: new Date(),
  };

  // Invariant: commit mode (hidden switch) always forces blocking on.
  if (merged.hideActivateSwitch) merged.active = true;

  const [row] = await db
    .insert(focusGuardSettings)
    .values({ ownerId, ...merged })
    .onConflictDoUpdate({ target: focusGuardSettings.ownerId, set: merged })
    .returning();

  res.json(toSettingsResponse(row));
});

/**
 * Per-site time analytics, reported by the extension. Pro-only: free users
 * get isPro=false and an empty list so the UI can show an upgrade prompt.
 */
router.get("/focus-guard/analytics", async (req, res) => {
  const { deviceId, days } = GetFocusGuardAnalyticsQueryParams.parse(req.query);
  const ownerId = resolveOwnerId(req, deviceId);

  const auth = getAuth(req);
  const isPro = await checkIsProSubscriber(auth?.userId ?? null);
  if (!isPro) {
    res.json({ isPro: false, totals: [] });
    return;
  }

  const windowDays = Math.min(Math.max(days ?? 7, 1), 90);
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const totals = await db
    .select({
      domain: focusGuardUsage.domain,
      seconds: sql<number>`sum(${focusGuardUsage.seconds})::int`,
    })
    .from(focusGuardUsage)
    .where(and(eq(focusGuardUsage.ownerId, ownerId), gte(focusGuardUsage.day, since)))
    .groupBy(focusGuardUsage.domain)
    .orderBy(desc(sql`sum(${focusGuardUsage.seconds})`))
    .limit(50);

  res.json({ isPro: true, totals });
});

export default router;
