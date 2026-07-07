import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import express from "express";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

const TEST_USER_ID = `user_test_calendar_cleanup_${randomUUID().slice(0, 8)}`;

vi.mock("@clerk/express", () => ({
  getAuth: vi.fn(() => ({ userId: TEST_USER_ID })),
}));

const REVISED_BLOCKS = [
  {
    day: "mon",
    startTime: "09:00",
    endTime: "10:00",
    title: "Revised math",
    category: "homework",
    notes: null,
  },
];

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({ blocks: REVISED_BLOCKS }),
              },
            },
          ],
        })),
      },
    },
  },
}));

// Record every fetch call so we can assert exactly which Google Calendar
// events were deleted. All Google API calls in these tests should be event
// DELETEs (the seeded connection token is not expired, so no token refresh).
const fetchCalls: Array<{ url: string; method: string }> = [];
vi.stubGlobal(
  "fetch",
  vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = input.toString();
    const method = init?.method ?? "GET";
    fetchCalls.push({ url, method });
    if (
      url.startsWith("https://www.googleapis.com/calendar/v3/") &&
      method === "DELETE"
    ) {
      return new Response(null, { status: 204 });
    }
    throw new Error(`Unexpected fetch in test: ${method} ${url}`);
  }),
);

const { db, schedules, googleCalendarConnections, scheduleCalendarSyncs } =
  await import("@workspace/db");
const schedulesRouter = (await import("./schedules")).default;

const app = express();
app.use(express.json());
app.use("/api", schedulesRouter);

function deletedEventIds(): string[] {
  return fetchCalls
    .filter((c) => c.method === "DELETE")
    .map((c) => c.url.split("/events/")[1]);
}

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
  eventIds: string[];
};

/**
 * Seeds a "complete" schedule with two blocks, a Google Calendar connection
 * for the test user, and one sync record (block -> google event) per block —
 * i.e. the state after a successful calendar sync.
 */
async function seedSyncedSchedule(): Promise<SeededSchedule> {
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
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      // Not expired, so getValidAccessToken never hits the token endpoint.
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })
    .onConflictDoNothing();

  const eventIds = blocks.map((b) => `gcal-event-${b.id}`);
  await db.insert(scheduleCalendarSyncs).values(
    blocks.map((b, i) => ({
      scheduleId: schedule.id,
      blockId: b.id,
      googleEventId: eventIds[i],
    })),
  );

  return { scheduleId: schedule.id, blocks, eventIds };
}

async function syncRowsFor(scheduleId: string) {
  return db
    .select()
    .from(scheduleCalendarSyncs)
    .where(eq(scheduleCalendarSyncs.scheduleId, scheduleId));
}

async function cleanupTestData() {
  await db.delete(schedules).where(eq(schedules.deviceId, TEST_USER_ID));
  await db
    .delete(googleCalendarConnections)
    .where(eq(googleCalendarConnections.ownerId, TEST_USER_ID));
  const strayScheduleIds = new Set<string>();
  // Sync rows are keyed by scheduleId; collect them via the fetch log is not
  // reliable, so delete any rows pointing at schedules we created (tracked
  // per test via seededScheduleIds).
  for (const id of seededScheduleIds) {
    strayScheduleIds.add(id);
  }
  for (const id of strayScheduleIds) {
    await db
      .delete(scheduleCalendarSyncs)
      .where(eq(scheduleCalendarSyncs.scheduleId, id));
  }
  seededScheduleIds.length = 0;
}

const seededScheduleIds: string[] = [];

beforeEach(async () => {
  fetchCalls.length = 0;
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

describe("calendar event cleanup when blocks are removed", () => {
  it("PATCH /schedules/:id deletes the calendar event and sync record for a removed block, keeping the rest", async () => {
    const { scheduleId, blocks, eventIds } = await seedSyncedSchedule();
    seededScheduleIds.push(scheduleId);
    const [kept, removed] = blocks;

    const res = await request(app)
      .patch(`/api/schedules/${scheduleId}`)
      .send({ deviceId: TEST_USER_ID, blocks: [kept] });

    expect(res.status).toBe(200);
    expect(res.body.blocks).toHaveLength(1);
    expect(res.body.blocks[0].id).toBe(kept.id);

    // Only the removed block's Google event was deleted.
    expect(deletedEventIds()).toEqual([`gcal-event-${removed.id}`]);

    // Only the kept block's sync record remains.
    const rows = await syncRowsFor(scheduleId);
    expect(rows).toHaveLength(1);
    expect(rows[0].blockId).toBe(kept.id);
    expect(rows[0].googleEventId).toBe(eventIds[0]);
  });

  it("DELETE /schedules/:id deletes every calendar event and sync record for the schedule", async () => {
    const { scheduleId, eventIds } = await seedSyncedSchedule();
    seededScheduleIds.push(scheduleId);

    const res = await request(app)
      .delete(`/api/schedules/${scheduleId}`)
      .query({ deviceId: TEST_USER_ID });

    expect(res.status).toBe(204);

    // Both events removed from Google Calendar (order-insensitive).
    expect(deletedEventIds().sort()).toEqual([...eventIds].sort());

    // All sync records gone, and the schedule itself is gone.
    expect(await syncRowsFor(scheduleId)).toHaveLength(0);
    const remaining = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, scheduleId));
    expect(remaining).toHaveLength(0);
  });

  it("POST /schedules/:id/revise deletes calendar events for blocks dropped by the AI revision", async () => {
    const { scheduleId, eventIds } = await seedSyncedSchedule();
    seededScheduleIds.push(scheduleId);

    const res = await request(app)
      .post(`/api/schedules/${scheduleId}/revise`)
      .send({ deviceId: TEST_USER_ID, instruction: "Replace everything" });

    expect(res.status).toBe(200);
    expect(res.body.blocks).toHaveLength(1);
    expect(res.body.blocks[0].title).toBe("Revised math");

    // Revision assigns fresh block ids, so every old block counts as removed:
    // both original events must be deleted and no sync rows may remain.
    expect(deletedEventIds().sort()).toEqual([...eventIds].sort());
    expect(await syncRowsFor(scheduleId)).toHaveLength(0);
  });

  it("PATCH with all blocks kept deletes nothing", async () => {
    const { scheduleId, blocks } = await seedSyncedSchedule();
    seededScheduleIds.push(scheduleId);

    const res = await request(app)
      .patch(`/api/schedules/${scheduleId}`)
      .send({ deviceId: TEST_USER_ID, blocks });

    expect(res.status).toBe(200);
    expect(deletedEventIds()).toEqual([]);
    expect(await syncRowsFor(scheduleId)).toHaveLength(2);
  });

  it("still removes the sync record when Google reports the event already gone (404)", async () => {
    const { scheduleId, blocks } = await seedSyncedSchedule();
    seededScheduleIds.push(scheduleId);
    const [kept] = blocks;

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockImplementationOnce(
      async (input: string | URL | Request, init?: RequestInit) => {
        fetchCalls.push({
          url: input.toString(),
          method: init?.method ?? "GET",
        });
        return new Response("Not Found", { status: 404 });
      },
    );

    const res = await request(app)
      .patch(`/api/schedules/${scheduleId}`)
      .send({ deviceId: TEST_USER_ID, blocks: [kept] });

    expect(res.status).toBe(200);
    const rows = await syncRowsFor(scheduleId);
    expect(rows).toHaveLength(1);
    expect(rows[0].blockId).toBe(kept.id);
  });
});
