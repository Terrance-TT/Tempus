import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import express from "express";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

const TEST_USER_ID = `user_test_cal_sync_${randomUUID().slice(0, 8)}`;

vi.mock("@clerk/express", () => ({
  getAuth: vi.fn(() => ({ userId: TEST_USER_ID })),
}));

/**
 * All outbound fetch calls go through this stub. Each test overrides
 * mockImplementationOnce for the calls it expects (token endpoint, calendar
 * API), and the base implementation throws so unexpected calls surface
 * immediately.
 */
const fetchCalls: Array<{ url: string; method: string; body?: string }> = [];
vi.stubGlobal(
  "fetch",
  vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = input.toString();
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? init.body : undefined;
    fetchCalls.push({ url, method, body });
    throw new Error(`Unexpected fetch in test: ${method} ${url}`);
  }),
);

const { db, schedules, googleCalendarConnections, scheduleCalendarSyncs } =
  await import("@workspace/db");
const googleCalendarRouter = (await import("./googleCalendar")).default;

const app = express();
app.use(express.json());
app.use("/api", googleCalendarRouter);

// ─── helpers ────────────────────────────────────────────────────────────────

type SeededSchedule = {
  scheduleId: string;
  blocks: Array<{
    id: string;
    day: string;
    startTime: string;
    endTime: string;
    title: string;
    category: string;
    notes: string | null;
  }>;
};

/** Seeds a schedule with no existing sync records and a fresh (not-expired) connection. */
async function seedScheduleFreshToken(): Promise<SeededSchedule> {
  const blocks = [
    {
      id: randomUUID(),
      day: "mon",
      startTime: "09:00",
      endTime: "10:00",
      title: "Math homework",
      category: "homework",
      notes: null,
    },
    {
      id: randomUUID(),
      day: "tue",
      startTime: "14:00",
      endTime: "15:00",
      title: "Biology reading",
      category: "homework",
      notes: null,
    },
  ];

  const [schedule] = await db
    .insert(schedules)
    .values({
      deviceId: TEST_USER_ID,
      scope: "week",
      status: "complete",
      blocks,
      clarifyingQuestions: [],
      answers: [],
      tasks: [],
      commitmentsSnapshot: [],
    })
    .returning();

  await db
    .insert(googleCalendarConnections)
    .values({
      ownerId: TEST_USER_ID,
      accessToken: "valid-access-token",
      refreshToken: "valid-refresh-token",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })
    .onConflictDoUpdate({
      target: googleCalendarConnections.ownerId,
      set: {
        accessToken: "valid-access-token",
        refreshToken: "valid-refresh-token",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        updatedAt: new Date(),
      },
    });

  return { scheduleId: schedule.id, blocks };
}

/**
 * Seeds a schedule with no existing sync records and an already-expired
 * connection, so getValidAccessToken will always attempt a token refresh.
 */
async function seedScheduleExpiredToken(): Promise<SeededSchedule> {
  const blocks = [
    {
      id: randomUUID(),
      day: "mon",
      startTime: "09:00",
      endTime: "10:00",
      title: "Math homework",
      category: "homework",
      notes: null,
    },
    {
      id: randomUUID(),
      day: "tue",
      startTime: "14:00",
      endTime: "15:00",
      title: "Biology reading",
      category: "homework",
      notes: null,
    },
  ];

  const [schedule] = await db
    .insert(schedules)
    .values({
      deviceId: TEST_USER_ID,
      scope: "week",
      status: "complete",
      blocks,
      clarifyingQuestions: [],
      answers: [],
      tasks: [],
      commitmentsSnapshot: [],
    })
    .returning();

  await db
    .insert(googleCalendarConnections)
    .values({
      ownerId: TEST_USER_ID,
      accessToken: "expired-access-token",
      refreshToken: "expired-refresh-token",
      // One hour in the past — getValidAccessToken will hit the token endpoint.
      expiresAt: new Date(Date.now() - 60 * 60 * 1000),
    })
    .onConflictDoUpdate({
      target: googleCalendarConnections.ownerId,
      set: {
        accessToken: "expired-access-token",
        refreshToken: "expired-refresh-token",
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
        updatedAt: new Date(),
      },
    });

  return { scheduleId: schedule.id, blocks };
}

/**
 * Seeds a schedule with existing sync records (simulating a prior sync) and
 * an expired connection, so the sync will UPDATE existing events.
 */
async function seedScheduleExpiredTokenWithExistingSyncs(): Promise<
  SeededSchedule & { eventIds: string[] }
> {
  const { scheduleId, blocks } = await seedScheduleExpiredToken();

  const eventIds = blocks.map((b) => `gcal-event-${b.id}`);
  await db.insert(scheduleCalendarSyncs).values(
    blocks.map((b, i) => ({
      scheduleId,
      blockId: b.id,
      googleEventId: eventIds[i],
    })),
  );

  return { scheduleId, blocks, eventIds };
}

/** Returns a mock response factory for a successful token refresh. */
function makeTokenRefreshResponse() {
  return async (_input: string | URL | Request, init?: RequestInit) => {
    const url = _input.toString();
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? init.body : undefined;
    fetchCalls.push({ url, method, body });
    return new Response(
      JSON.stringify({
        access_token: "refreshed-access-token",
        expires_in: 3600,
        token_type: "Bearer",
        scope: "https://www.googleapis.com/auth/calendar.events",
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
}

/** Returns a mock response factory for a Google Calendar event POST/PUT. */
function makeCalendarEventResponse(eventId: string) {
  return async (_input: string | URL | Request, init?: RequestInit) => {
    const url = _input.toString();
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? init.body : undefined;
    fetchCalls.push({ url, method, body });
    return new Response(JSON.stringify({ id: eventId }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

/** Extracts the token used in the Authorization header from a calendar fetch. */
function calendarFetchTokens(): string[] {
  return fetchCalls
    .filter((c) => c.url.startsWith("https://www.googleapis.com/calendar/v3/"))
    .map((c) => {
      // We can only inspect the method/url from the stub; the token is embedded
      // in the init.headers, which we don't capture in fetchCalls. Instead,
      // assert the URL so we know the right endpoint was hit.
      return c.method;
    });
}

/** Returns all token-endpoint POST calls recorded in this test. */
function tokenRefreshCalls() {
  return fetchCalls.filter(
    (c) =>
      c.url === "https://oauth2.googleapis.com/token" && c.method === "POST",
  );
}

const seededScheduleIds: string[] = [];

async function cleanupTestData() {
  for (const id of seededScheduleIds) {
    await db
      .delete(scheduleCalendarSyncs)
      .where(eq(scheduleCalendarSyncs.scheduleId, id));
  }
  seededScheduleIds.length = 0;
  await db.delete(schedules).where(eq(schedules.deviceId, TEST_USER_ID));
  await db
    .delete(googleCalendarConnections)
    .where(eq(googleCalendarConnections.ownerId, TEST_USER_ID));
}

beforeEach(async () => {
  fetchCalls.length = 0;
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

// ─── tests ──────────────────────────────────────────────────────────────────

describe("POST /schedules/:id/sync-google-calendar — expired token refresh", () => {
  it("refreshes an expired token and creates calendar events (insert path)", async () => {
    const { scheduleId, blocks } = await seedScheduleExpiredToken();
    seededScheduleIds.push(scheduleId);

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;

    // 1. Token refresh
    fetchMock.mockImplementationOnce(makeTokenRefreshResponse());

    // 2. Calendar event POSTs (one per block)
    for (const block of blocks) {
      fetchMock.mockImplementationOnce(
        makeCalendarEventResponse(`gcal-new-${block.id}`),
      );
    }

    const res = await request(app)
      .post(`/api/schedules/${scheduleId}/sync-google-calendar`)
      .send({ timeZone: "America/New_York" });

    expect(res.status).toBe(200);
    expect(res.body.syncedCount).toBe(blocks.length);

    // Token endpoint was called exactly once.
    expect(tokenRefreshCalls()).toHaveLength(1);

    // The refreshed token must be persisted in the DB.
    const [conn] = await db
      .select()
      .from(googleCalendarConnections)
      .where(eq(googleCalendarConnections.ownerId, TEST_USER_ID));
    expect(conn).toBeDefined();
    expect(conn.accessToken).toBe("refreshed-access-token");

    // Sync records were written for each block with the new event IDs.
    const syncs = await db
      .select()
      .from(scheduleCalendarSyncs)
      .where(eq(scheduleCalendarSyncs.scheduleId, scheduleId));
    expect(syncs).toHaveLength(blocks.length);
    const syncedBlockIds = syncs.map((s) => s.blockId).sort();
    expect(syncedBlockIds).toEqual(blocks.map((b) => b.id).sort());

    // All calendar-API calls used the refreshed token (not the expired one).
    // We verify this indirectly: only POST calls to the calendar endpoint
    // should exist (no DELETEs, no stale calls with the old token).
    const calendarCalls = fetchCalls.filter((c) =>
      c.url.startsWith("https://www.googleapis.com/calendar/v3/"),
    );
    expect(calendarCalls.every((c) => c.method === "POST")).toBe(true);
    expect(calendarCalls).toHaveLength(blocks.length);
  });

  it("refreshes an expired token and updates calendar events (update path)", async () => {
    const { scheduleId, blocks, eventIds } =
      await seedScheduleExpiredTokenWithExistingSyncs();
    seededScheduleIds.push(scheduleId);

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;

    // 1. Token refresh
    fetchMock.mockImplementationOnce(makeTokenRefreshResponse());

    // 2. Calendar event PUTs (one per block — updating existing events)
    for (const [i] of blocks.entries()) {
      fetchMock.mockImplementationOnce(
        makeCalendarEventResponse(eventIds[i]),
      );
    }

    const res = await request(app)
      .post(`/api/schedules/${scheduleId}/sync-google-calendar`)
      .send({ timeZone: "America/New_York" });

    expect(res.status).toBe(200);
    expect(res.body.syncedCount).toBe(blocks.length);

    // Token refresh happened exactly once.
    expect(tokenRefreshCalls()).toHaveLength(1);

    // Refreshed token was persisted.
    const [conn] = await db
      .select()
      .from(googleCalendarConnections)
      .where(eq(googleCalendarConnections.ownerId, TEST_USER_ID));
    expect(conn.accessToken).toBe("refreshed-access-token");

    // All calendar API calls were PUT (update) calls, not POSTs.
    const calendarCalls = fetchCalls.filter((c) =>
      c.url.startsWith("https://www.googleapis.com/calendar/v3/"),
    );
    expect(calendarCalls.every((c) => c.method === "PUT")).toBe(true);
    expect(calendarCalls).toHaveLength(blocks.length);

    // Sync records still point at the same event IDs (no recreation needed).
    const syncs = await db
      .select()
      .from(scheduleCalendarSyncs)
      .where(eq(scheduleCalendarSyncs.scheduleId, scheduleId));
    const syncedEventIds = syncs.map((s) => s.googleEventId).sort();
    expect(syncedEventIds).toEqual([...eventIds].sort());
  });
});

describe("POST /schedules/:id/sync-google-calendar — partial failure", () => {
  it("continues syncing remaining blocks and reports failedCount when one block errors mid-sync", async () => {
    const { scheduleId, blocks } = await seedScheduleFreshToken();
    seededScheduleIds.push(scheduleId);
    expect(blocks.length).toBeGreaterThanOrEqual(2);

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;

    // First block succeeds, second block hits a transient 5xx from Google.
    fetchMock.mockImplementationOnce(makeCalendarEventResponse(`gcal-new-${blocks[0].id}`));
    fetchMock.mockImplementationOnce(async (_input: string | URL | Request, init?: RequestInit) => {
      fetchCalls.push({ url: _input.toString(), method: init?.method ?? "GET" });
      return new Response("Internal error", { status: 503 });
    });

    const res = await request(app)
      .post(`/api/schedules/${scheduleId}/sync-google-calendar`)
      .send({ timeZone: "America/New_York" });

    // The endpoint must not abort or 500 — it reports partial success.
    expect(res.status).toBe(200);
    expect(res.body.syncedCount).toBe(1);
    expect(res.body.totalCount).toBe(blocks.length);
    expect(res.body.failedCount).toBe(blocks.length - 1);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].blockId).toBe(blocks[1].id);

    // The successfully-synced block's row must still be persisted.
    const syncs = await db
      .select()
      .from(scheduleCalendarSyncs)
      .where(eq(scheduleCalendarSyncs.scheduleId, scheduleId));
    expect(syncs).toHaveLength(1);
    expect(syncs[0].blockId).toBe(blocks[0].id);
  });
});

describe("POST /schedules/:id/sync-google-calendar — revoked token", () => {
  it("cleans up the connection row and returns 409 (not 500) when the refresh token is revoked", async () => {
    const { scheduleId } = await seedScheduleExpiredToken();
    seededScheduleIds.push(scheduleId);

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;

    // Token refresh fails — simulates a revoked/expired refresh token.
    fetchMock.mockImplementationOnce(
      async (_input: string | URL | Request, init?: RequestInit) => {
        fetchCalls.push({
          url: _input.toString(),
          method: init?.method ?? "GET",
        });
        return new Response('{"error":"invalid_grant"}', { status: 400 });
      },
    );

    const res = await request(app)
      .post(`/api/schedules/${scheduleId}/sync-google-calendar`)
      .send({ timeZone: "America/New_York" });

    // Must be 409 (needsConnect), never a 500.
    expect(res.status).toBe(409);
    expect(res.body.needsConnect).toBe(true);

    // The stale connection row must be deleted so the user is prompted to
    // reconnect rather than looping in a broken state.
    const conns = await db
      .select()
      .from(googleCalendarConnections)
      .where(eq(googleCalendarConnections.ownerId, TEST_USER_ID));
    expect(conns).toHaveLength(0);

    // No calendar API calls should have been made — nothing to sync.
    const calendarCalls = fetchCalls.filter((c) =>
      c.url.startsWith("https://www.googleapis.com/calendar/v3/"),
    );
    expect(calendarCalls).toHaveLength(0);
  });

  it("returns 409 with needsConnect when the connection is missing entirely", async () => {
    // Seed a schedule but no connection — simulates the user having never
    // connected or having already been cleaned up.
    const { scheduleId } = await seedScheduleFreshToken();
    seededScheduleIds.push(scheduleId);

    // Remove the connection that seedScheduleFreshToken just created.
    await db
      .delete(googleCalendarConnections)
      .where(eq(googleCalendarConnections.ownerId, TEST_USER_ID));

    const res = await request(app)
      .post(`/api/schedules/${scheduleId}/sync-google-calendar`)
      .send({ timeZone: "America/New_York" });

    expect(res.status).toBe(409);
    expect(res.body.needsConnect).toBe(true);

    // No fetch calls should have been made.
    expect(fetchCalls).toHaveLength(0);
  });
});
