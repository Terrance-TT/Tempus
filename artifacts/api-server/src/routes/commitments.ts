import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, commitments } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { resolveOwnerId } from "../lib/auth";
import {
  ListCommitmentsQueryParams,
  CreateCommitmentBody,
  UpdateCommitmentParams,
  UpdateCommitmentBody,
  DeleteCommitmentParams,
  DeleteCommitmentQueryParams,
  ExtractCommitmentsFromImageBody,
  ExtractCommitmentsFromTextBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const extractionResultSchema = {
  type: "object",
  properties: {
    commitments: {
      type: "array",
      description:
        "Every recurring commitment found in the schedule photo. One entry per distinct class/activity/routine, listing all days it repeats.",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short name, e.g. 'Calculus'" },
          type: {
            type: "string",
            enum: ["class", "extracurricular", "routine"],
          },
          daysOfWeek: {
            type: "array",
            items: {
              type: "string",
              enum: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
            },
          },
          startTime: { type: "string", description: "24h HH:mm" },
          endTime: { type: "string", description: "24h HH:mm" },
          notes: { type: ["string", "null"] },
        },
        required: [
          "title",
          "type",
          "daysOfWeek",
          "startTime",
          "endTime",
          "notes",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["commitments"],
  additionalProperties: false,
} as const;

type ExtractedCommitment = {
  title: string;
  type: "class" | "extracurricular" | "routine";
  daysOfWeek: string[];
  startTime: string;
  endTime: string;
  notes: string | null;
};

function detectMimeFromBase64(base64: string): string {
  if (base64.startsWith("iVBOR")) return "image/png";
  if (base64.startsWith("/9j/")) return "image/jpeg";
  if (base64.startsWith("R0lG")) return "image/gif";
  if (base64.startsWith("UklGR")) return "image/webp";
  return "image/jpeg";
}

function toDataUrl(imageBase64: string): string {
  return imageBase64.startsWith("data:")
    ? imageBase64
    : `data:${detectMimeFromBase64(imageBase64)};base64,${imageBase64}`;
}

router.post("/commitments/extract-image", async (req, res) => {
  const body = ExtractCommitmentsFromImageBody.parse(req.body);
  const ownerId = resolveOwnerId(req, body.deviceId);

  const systemPrompt = `You are an assistant that reads a photo of a student's weekly schedule or timetable and extracts the recurring commitments.

Rules:
- Extract every class, extracurricular activity, and routine (like a standing club, practice, or meal block) visible in the image.
- Group repeats: if the same class occurs on multiple days at the same time, return ONE entry with all its days in daysOfWeek.
- Classify each as "class" (academic courses/lectures/labs), "extracurricular" (sports, clubs, jobs, activities), or "routine" (personal recurring blocks like meals, gym, sleep).
- Times must be 24-hour "HH:mm". Convert AM/PM if needed.
- Only include what is clearly in the image. Do not invent commitments. If the image has no readable schedule, return an empty commitments array.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 4096,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract the recurring commitments from this schedule photo.",
          },
          {
            type: "image_url",
            image_url: { url: toDataUrl(body.imageBase64) },
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "commitment_extraction_result",
        strict: true,
        schema: extractionResultSchema,
      },
    },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("No content returned from commitment extraction model");
  }

  let parsed: { commitments: ExtractedCommitment[] };
  try {
    parsed = JSON.parse(raw) as { commitments: ExtractedCommitment[] };
  } catch {
    throw new Error("Commitment extraction model returned malformed JSON");
  }
  const extracted = parsed.commitments ?? [];

  if (extracted.length === 0) {
    res.status(201).json([]);
    return;
  }

  // Skip exact duplicates: same title + startTime + endTime + sorted days already exist
  const existing = await db.select().from(commitments).where(eq(commitments.deviceId, ownerId));
  const existingKeys = new Set(
    existing.map((r) => `${r.title.toLowerCase()}|||${r.startTime ?? ""}|||${r.endTime ?? ""}|||${[...(r.daysOfWeek ?? [])].sort().join(",")}`)
  );
  const newOnes = extracted.filter((c) =>
    !existingKeys.has(`${c.title.toLowerCase()}|||${c.startTime}|||${c.endTime}|||${[...c.daysOfWeek].sort().join(",")}`)
  );

  if (newOnes.length === 0) {
    res.status(201).json([]);
    return;
  }

  const inserted = await db
    .insert(commitments)
    .values(
      newOnes.map((c) => ({
        deviceId: ownerId,
        title: c.title,
        type: c.type,
        daysOfWeek: c.daysOfWeek,
        startTime: c.startTime,
        endTime: c.endTime,
        notes: c.notes ?? null,
      })),
    )
    .returning();

  res
    .status(201)
    .json(
      inserted.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    );
});

router.post("/commitments/extract-text", async (req, res) => {
  const body = ExtractCommitmentsFromTextBody.parse(req.body);
  const ownerId = resolveOwnerId(req, body.deviceId);

  const systemPrompt = `You are an assistant that reads a student's plain-text description of their weekly schedule and extracts the recurring commitments.

Rules:
- Extract every class, extracurricular activity, and routine (like a standing club, practice, or meal block) the student mentions.
- Group repeats: if the same activity occurs on multiple days at the same time, return ONE entry with all its days in daysOfWeek.
- Classify each as "class" (academic courses/lectures/labs, including "school"), "extracurricular" (sports, clubs, jobs, activities), or "routine" (personal recurring blocks like meals, gym, sleep).
- Times must be 24-hour "HH:mm". Convert AM/PM if needed. Interpret ambiguous times sensibly for a student (e.g. "school 8-3" means 08:00-15:00, "practice 4-5" means 16:00-17:00).
- If the student doesn't specify days for something like school, assume weekdays (mon-fri).
- Only include what the student actually describes. Do not invent commitments. If the text contains no recognizable schedule, return an empty commitments array.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 4096,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Extract the recurring commitments from this description of my schedule:\n\n${body.description}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "commitment_extraction_result",
        strict: true,
        schema: extractionResultSchema,
      },
    },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("No content returned from commitment extraction model");
  }

  let parsed: { commitments: ExtractedCommitment[] };
  try {
    parsed = JSON.parse(raw) as { commitments: ExtractedCommitment[] };
  } catch {
    throw new Error("Commitment extraction model returned malformed JSON");
  }
  const extracted = parsed.commitments ?? [];

  if (extracted.length === 0) {
    res.status(201).json([]);
    return;
  }

  // Skip exact duplicates: same title + startTime + endTime + sorted days already exist
  const existing = await db.select().from(commitments).where(eq(commitments.deviceId, ownerId));
  const existingKeys = new Set(
    existing.map((r) => `${r.title.toLowerCase()}|||${r.startTime ?? ""}|||${r.endTime ?? ""}|||${[...(r.daysOfWeek ?? [])].sort().join(",")}`)
  );
  const newOnes = extracted.filter((c) =>
    !existingKeys.has(`${c.title.toLowerCase()}|||${c.startTime}|||${c.endTime}|||${[...c.daysOfWeek].sort().join(",")}`)
  );

  if (newOnes.length === 0) {
    res.status(201).json([]);
    return;
  }

  const inserted = await db
    .insert(commitments)
    .values(
      newOnes.map((c) => ({
        deviceId: ownerId,
        title: c.title,
        type: c.type,
        daysOfWeek: c.daysOfWeek,
        startTime: c.startTime,
        endTime: c.endTime,
        notes: c.notes ?? null,
      })),
    )
    .returning();

  res
    .status(201)
    .json(
      inserted.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    );
});

router.get("/commitments", async (req, res) => {
  const { deviceId } = ListCommitmentsQueryParams.parse(req.query);
  const ownerId = resolveOwnerId(req, deviceId);
  const rows = await db
    .select()
    .from(commitments)
    .where(eq(commitments.deviceId, ownerId));

  // Deduplicate: merge rows with the same title+startTime+endTime, combining their days
  const seen = new Map<string, typeof rows[number]>();
  for (const row of rows) {
    const key = `${row.title.toLowerCase()}|||${row.startTime ?? ""}|||${row.endTime ?? ""}`;
    const existing = seen.get(key);
    if (existing) {
      const merged = [...new Set([...(existing.daysOfWeek ?? []), ...(row.daysOfWeek ?? [])])];
      seen.set(key, { ...existing, daysOfWeek: merged });
    } else {
      seen.set(key, { ...row });
    }
  }

  res.json(
    [...seen.values()].map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
  );
});

router.post("/commitments", async (req, res) => {
  const body = CreateCommitmentBody.parse(req.body);
  const ownerId = resolveOwnerId(req, body.deviceId);
  const [row] = await db
    .insert(commitments)
    .values({
      deviceId: ownerId,
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
  const ownerId = resolveOwnerId(req, body.deviceId);
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
    .where(and(eq(commitments.id, id), eq(commitments.deviceId, ownerId)))
    .returning();

  if (!row) {
    res.status(404).json({ message: "Commitment not found" });
    return;
  }

  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.delete("/commitments/:id", async (req, res) => {
  const { id } = DeleteCommitmentParams.parse(req.params);
  const { deviceId } = DeleteCommitmentQueryParams.parse(req.query);
  const ownerId = resolveOwnerId(req, deviceId);
  const [existing] = await db
    .select()
    .from(commitments)
    .where(and(eq(commitments.id, id), eq(commitments.deviceId, ownerId)));
  if (!existing) {
    res.status(404).json({ message: "Commitment not found" });
    return;
  }
  await db
    .delete(commitments)
    .where(and(eq(commitments.id, id), eq(commitments.deviceId, ownerId)));
  res.status(204).end();
});

export default router;
