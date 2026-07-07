import { Router, type IRouter } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db, staffRoles, manualRequests, manualResponses } from "@workspace/db";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { requireAdmin, getUserRole } from "../lib/staffAuth";

const router: IRouter = Router();

// Get current user's role
router.get("/admin/me/role", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.json({ role: null });
    return;
  }
  const role = await getUserRole(userId);
  res.json({ role });
});

// List all staff members
router.get("/admin/staff", requireAdmin, async (_req, res) => {
  const rows = await db.select().from(staffRoles).orderBy(desc(staffRoles.createdAt));
  res.json({ data: rows });
});

// Search Clerk users by email (for adding staff)
router.get("/admin/users/search", requireAdmin, async (req, res) => {
  const email = (req.query.email as string | undefined)?.trim();
  if (!email) {
    res.status(400).json({ error: "email query param required" });
    return;
  }
  try {
    const { data: users } = await clerkClient.users.getUserList({
      emailAddress: [email],
      limit: 5,
    });
    res.json({
      data: users.map((u: any) => ({
        id: u.id,
        email:
          u.emailAddresses.find((e: any) => e.id === u.primaryEmailAddressId)
            ?.emailAddress ?? "",
        firstName: u.firstName,
        lastName: u.lastName,
        imageUrl: u.imageUrl,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Grant employee role
router.post("/admin/staff", requireAdmin, async (req, res) => {
  const { userId: grantorId } = getAuth(req);
  const { userId, email } = req.body as { userId?: string; email?: string };
  if (!userId || !email) {
    res.status(400).json({ error: "userId and email required" });
    return;
  }
  await db
    .insert(staffRoles)
    .values({ userId, email, role: "employee", grantedBy: grantorId ?? null })
    .onConflictDoUpdate({
      target: staffRoles.userId,
      set: { role: "employee", email, grantedBy: grantorId ?? null },
    });
  res.json({ success: true });
});

// Revoke staff role
router.delete("/admin/staff/:userId", requireAdmin, async (req, res) => {
  const uid = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  await db.delete(staffRoles).where(eq(staffRoles.userId, uid));
  res.json({ success: true });
});

// List all manual requests (with their response if completed)
router.get("/admin/requests", requireAdmin, async (_req, res) => {
  const requests = await db
    .select()
    .from(manualRequests)
    .orderBy(desc(manualRequests.createdAt))
    .limit(200);

  const requestIds = requests.map((r) => r.id);
  const responses =
    requestIds.length > 0
      ? await db
          .select()
          .from(manualResponses)
          .where(inArray(manualResponses.requestId, requestIds))
      : [];

  const responseMap = new Map(responses.map((r) => [r.requestId, r]));
  res.json({
    data: requests.map((r) => ({ ...r, response: responseMap.get(r.id) ?? null })),
  });
});

export default router;
