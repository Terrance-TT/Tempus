import { Router, type IRouter } from "express";
import * as ical from "node-ical";
import { db, commitments } from "@workspace/db";
import { resolveOwnerId } from "../lib/auth";

const router: IRouter = Router();

const ALLOWED_HOST_PATTERNS = [/\.campusgroups\.com$/, /\.columbia\.edu$/];

function validateIcsUrl(rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw Object.assign(new Error("Invalid ICS URL — please paste the full URL from SPS Engage."), { status: 400 });
  }
  if (parsed.protocol !== "https:") {
    throw Object.assign(new Error("ICS URL must use HTTPS."), { status: 400 });
  }
  if (!ALLOWED_HOST_PATTERNS.some((re) => re.test(parsed.hostname))) {
    throw Object.assign(
      new Error("ICS URL must be from a campusgroups.com or columbia.edu host."),
      { status: 400 },
    );
  }
}

const DAY_MAP: Record<number, string> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function summaryToString(val: ical.ParameterValue | undefined): string {
  if (!val) return "Untitled Event";
  if (typeof val === "string") return val;
  if (typeof val === "object" && "val" in val) return String((val as any).val);
  return String(val);
}

router.post("/sps-engage/preview-ics", async (req, res) => {
  const { icsUrl, deviceId: _deviceId } = req.body as { icsUrl?: string; deviceId?: string };
  if (!icsUrl || typeof icsUrl !== "string") {
    res.status(400).json({ message: "icsUrl is required" });
    return;
  }

  try {
    validateIcsUrl(icsUrl);
  } catch (err: any) {
    res.status(err.status ?? 400).json({ message: err.message });
    return;
  }

  const calData = await ical.async.fromURL(icsUrl);
  const now = new Date();
  const cutoff = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const upcoming = Object.values(calData)
    .filter((e): e is ical.VEvent => !!e && e.type === "VEVENT")
    .flatMap((e) => {
      if (e.rrule) {
        return ical.expandRecurringEvent(e, { from: now, to: cutoff }).map((inst) => {
          const instEnd = inst.end ?? new Date(inst.start.getTime() + 60 * 60 * 1000);
          return {
            uid: `${e.uid}-${inst.start.toISOString()}`,
            title: summaryToString(e.summary),
            startIso: inst.start.toISOString(),
            endIso: instEnd.toISOString(),
            location: summaryToString(e.location) || null,
            url: (e as any).url ?? null,
          };
        });
      }

      const start = e.start instanceof Date ? e.start : new Date(e.start as any);
      if (start < now || start > cutoff) return [];
      const end =
        e.end instanceof Date
          ? e.end
          : e.end
            ? new Date(e.end as any)
            : new Date(start.getTime() + 60 * 60 * 1000);

      return [
        {
          uid: e.uid,
          title: summaryToString(e.summary),
          startIso: start.toISOString(),
          endIso: end.toISOString(),
          location: summaryToString(e.location) || null,
          url: (e as any).url ?? null,
        },
      ];
    })
    .sort((a, b) => new Date(a.startIso).getTime() - new Date(b.startIso).getTime());

  res.json(upcoming);
});

type SpsEventInput = {
  uid: string;
  title: string;
  startIso: string;
  endIso: string;
};

router.post("/sps-engage/import-events", async (req, res) => {
  const { deviceId, events } = req.body as { deviceId?: string; events?: SpsEventInput[] };
  if (!Array.isArray(events) || events.length === 0) {
    res.status(400).json({ message: "events array is required and must not be empty" });
    return;
  }

  const ownerId = resolveOwnerId(req, deviceId ?? "");

  const inserted = await db
    .insert(commitments)
    .values(
      events.map((ev) => {
        const start = new Date(ev.startIso);
        const end = new Date(ev.endIso);
        const dayOfWeek = DAY_MAP[start.getDay()] ?? "mon";
        const startTime = `${pad2(start.getHours())}:${pad2(start.getMinutes())}`;
        const endTime = `${pad2(end.getHours())}:${pad2(end.getMinutes())}`;
        return {
          deviceId: ownerId,
          title: ev.title,
          type: "extracurricular" as const,
          daysOfWeek: [dayOfWeek],
          startTime,
          endTime,
          notes: null,
        };
      }),
    )
    .returning();

  res.status(201).json(
    inserted.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
  );
});

export default router;
