import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, manualRequests, manualResponses } from "@workspace/db";
import { eq, or, desc, inArray } from "drizzle-orm";
import { requireStaff } from "../lib/staffAuth";
import { ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();

// List requests visible to this employee (pending + assigned to me)
router.get("/staff/requests", requireStaff, async (req, res) => {
  const { userId } = getAuth(req);
  const rows = await db
    .select()
    .from(manualRequests)
    .where(
      or(
        eq(manualRequests.status, "pending"),
        eq(manualRequests.assignedToUserId, userId!),
      ),
    )
    .orderBy(desc(manualRequests.createdAt))
    .limit(100);
  res.json({ data: rows });
});

// Get a single request detail
router.get("/staff/requests/:id", requireStaff, async (req, res) => {
  const rows = await db
    .select()
    .from(manualRequests)
    .where(eq(manualRequests.id, req.params.id))
    .limit(1);
  if (!rows[0]) {
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

// Claim a request
router.post("/staff/requests/:id/claim", requireStaff, async (req, res) => {
  const { userId } = getAuth(req);
  const rows = await db
    .select()
    .from(manualRequests)
    .where(eq(manualRequests.id, req.params.id))
    .limit(1);
  if (!rows[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (rows[0].status !== "pending") {
    res.status(409).json({ error: "Request already claimed" });
    return;
  }
  await db
    .update(manualRequests)
    .set({ status: "in_progress", assignedToUserId: userId, updatedAt: new Date() })
    .where(eq(manualRequests.id, req.params.id));
  res.json({ success: true });
});

// Request a presigned URL for graphic upload
router.post("/staff/uploads/request-url", requireStaff, async (req, res) => {
  try {
    const uploadURL = await storage.getObjectEntityUploadURL();
    const objectPath = storage.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Submit a response to a request
router.post("/staff/requests/:id/respond", requireStaff, async (req, res) => {
  const { userId } = getAuth(req);
  const { message, scheduleContent, graphicPath } = req.body as {
    message?: string;
    scheduleContent?: string;
    graphicPath?: string;
  };

  const rows = await db
    .select()
    .from(manualRequests)
    .where(eq(manualRequests.id, req.params.id))
    .limit(1);
  if (!rows[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  // Delete any previous response for this request
  await db
    .delete(manualResponses)
    .where(eq(manualResponses.requestId, req.params.id));

  await db.insert(manualResponses).values({
    requestId: req.params.id,
    employeeUserId: userId!,
    message: message ?? null,
    scheduleContent: scheduleContent ?? null,
    graphicPath: graphicPath ?? null,
  });

  await db
    .update(manualRequests)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(manualRequests.id, req.params.id));

  res.json({ success: true });
});

export default router;
