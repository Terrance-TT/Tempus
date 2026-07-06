import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, commitments } from "@workspace/db";
import {
  ListCommitmentsQueryParams,
  CreateCommitmentBody,
  UpdateCommitmentParams,
  UpdateCommitmentBody,
  DeleteCommitmentParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/commitments", async (req, res) => {
  const { deviceId } = ListCommitmentsQueryParams.parse(req.query);
  const rows = await db
    .select()
    .from(commitments)
    .where(eq(commitments.deviceId, deviceId));
  res.json(
    rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
  );
});

router.post("/commitments", async (req, res) => {
  const body = CreateCommitmentBody.parse(req.body);
  const [row] = await db
    .insert(commitments)
    .values({
      deviceId: body.deviceId,
      title: body.title,
      type: body.type,
      daysOfWeek: body.daysOfWeek,
      startTime: body.startTime,
      endTime: body.endTime,
      notes: body.notes ?? null,
    })
    .returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.patch("/commitments/:id", async (req, res) => {
  const { id } = UpdateCommitmentParams.parse(req.params);
  const body = UpdateCommitmentBody.parse(req.body);
  const [row] = await db
    .update(commitments)
    .set({
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(body.daysOfWeek !== undefined
        ? { daysOfWeek: body.daysOfWeek }
        : {}),
      ...(body.startTime !== undefined ? { startTime: body.startTime } : {}),
      ...(body.endTime !== undefined ? { endTime: body.endTime } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    })
    .where(eq(commitments.id, id))
    .returning();

  if (!row) {
    res.status(404).json({ message: "Commitment not found" });
    return;
  }

  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.delete("/commitments/:id", async (req, res) => {
  const { id } = DeleteCommitmentParams.parse(req.params);
  await db.delete(commitments).where(eq(commitments.id, id));
  res.status(204).end();
});

export default router;
