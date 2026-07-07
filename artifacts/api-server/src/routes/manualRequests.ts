import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, manualRequests, manualResponses } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

// Create a manual schedule request (signed-in users only)
router.post("/manual-requests", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in required to request a human-crafted schedule" });
    return;
  }

  const { timetableDescription, assignments, preferences, ownerEmail } =
    req.body as {
      timetableDescription?: string;
      assignments?: unknown;
      preferences?: unknown;
      ownerEmail?: string;
    };

  const [row] = await db
    .insert(manualRequests)
    .values({
      ownerUserId: userId,
      ownerEmail: ownerEmail ?? null,
      timetableDescription: timetableDescription ?? null,
      assignments: assignments ?? null,
      preferences: preferences ?? null,
    })
    .returning();

  res.json({ data: row });
});

// List the current user's manual requests
router.get("/manual-requests/mine", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const rows = await db
    .select()
    .from(manualRequests)
    .where(eq(manualRequests.ownerUserId, userId))
    .orderBy(desc(manualRequests.createdAt))
    .limit(20);

  const responseRows = rows.length
    ? await db
        .select()
        .from(manualResponses)
        .where(
          eq(manualResponses.requestId, rows[0].id), // latest only
        )
        .limit(1)
    : [];

  res.json({ data: rows, responses: responseRows });
});

// Get a single request + response (owner only)
router.get("/manual-requests/:id", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const rows = await db
    .select()
    .from(manualRequests)
    .where(eq(manualRequests.id, req.params.id))
    .limit(1);
  if (!rows[0] || rows[0].ownerUserId !== userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const responseRows = await db
    .select()
    .from(manualResponses)
    .where(eq(manualResponses.requestId, req.params.id))
    .limit(1);
  res.json({ data: { ...rows[0], response: responseRows[0] ?? null } });
});

export default router;
