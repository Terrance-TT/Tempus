import { Router, type IRouter } from "express";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { createHmac, randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import {
  db,
  assignments,
  canvasConnections,
  googleCalendarConnections,
  schoologyConnections,
} from "@workspace/db";
import { resolveOwnerId } from "../lib/auth";
import {
  getValidAccessToken,
  GoogleReauthRequiredError,
} from "../lib/googleCalendar";
import {
  GetIntegrationsStatusQueryParams,
  ConnectCanvasBody,
  DisconnectCanvasQueryParams,
  ImportCanvasAssignmentsBody,
  ImportClassroomAssignmentsBody,
  ConnectSchoologyBody,
  DisconnectSchoologyQueryParams,
  ImportSchoologyAssignmentsBody,
  ListAssignmentsQueryParams,
  DeleteAssignmentParams,
  DeleteAssignmentQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

type AssignmentRow = typeof assignments.$inferSelect;

function serializeAssignment(row: AssignmentRow) {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

async function buildStatus(req: Parameters<typeof getAuth>[0], ownerId: string) {
  const [canvas] = await db
    .select()
    .from(canvasConnections)
    .where(eq(canvasConnections.ownerId, ownerId));

  const userId = getAuth(req)?.userId;
  let classroomConnected = false;
  if (userId) {
    const [google] = await db
      .select()
      .from(googleCalendarConnections)
      .where(eq(googleCalendarConnections.ownerId, userId));
    classroomConnected = Boolean(google);
  }

  const [schoology] = await db
    .select()
    .from(schoologyConnections)
    .where(eq(schoologyConnections.ownerId, ownerId));

  return {
    canvasConnected: Boolean(canvas),
    canvasBaseUrl: canvas?.baseUrl ?? null,
    classroomConnected,
    schoologyConnected: Boolean(schoology),
    schoologyDomain: schoology?.domain ?? null,
  };
}

function normalizeCanvasBaseUrl(input: string): string | null {
  let raw = input.trim();
  if (!raw) return null;
  if (/^http:\/\//i.test(raw)) return null;
  if (!/^https:\/\//i.test(raw)) {
    raw = `https://${raw}`;
  }
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (url.port && url.port !== "443") return null;
    return `https://${url.hostname}`;
  } catch {
    return null;
  }
}

function isPrivateIp(address: string): boolean {
  const v = isIP(address);
  if (v === 4) {
    const parts = address.split(".").map(Number);
    const [a, b] = parts;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  if (v === 6) {
    const lower = address.toLowerCase();
    if (lower === "::" || lower === "::1") return true;
    if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (lower.startsWith("::ffff:")) return isPrivateIp(lower.slice(7));
    return false;
  }
  return false;
}

async function isPublicCanvasHost(hostname: string): Promise<boolean> {
  const lower = hostname.toLowerCase();
  if (
    lower === "localhost" ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal") ||
    !lower.includes(".")
  ) {
    return false;
  }
  if (isIP(lower)) return !isPrivateIp(lower);
  try {
    const addresses = await lookup(lower, { all: true });
    if (addresses.length === 0) return false;
    return addresses.every((a) => !isPrivateIp(a.address));
  } catch {
    return false;
  }
}

async function canvasFetch(
  baseUrl: string,
  accessToken: string,
  path: string,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, data };
}

// --- OAuth 1.0a two-legged signing for Schoology ---

function normalizeSchoologyDomain(input: string): string | null {
  let raw = input.trim();
  if (!raw) return null;
  // Strip any scheme prefix — we always force https
  raw = raw.replace(/^https?:\/\//i, "");
  // Strip any path
  const hostname = raw.split("/")[0];
  if (!hostname || !hostname.includes(".")) return null;
  // Reject localhost / private-network names
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return null;
  }
  return hostname.toLowerCase();
}

function schoologyApiBase(domain: string): string {
  return `https://${domain}/api/v1`;
}

function buildOauth1Header(
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomUUID().replace(/-/g, "");

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_version: "1.0",
  };

  // Parse query params from URL to include in signature
  const urlObj = new URL(url);
  const allParams: Record<string, string> = { ...oauthParams };
  for (const [k, v] of urlObj.searchParams.entries()) {
    allParams[k] = v;
  }

  const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

  const normalizedParams = Object.entries(allParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(baseUrl),
    encodeURIComponent(normalizedParams),
  ].join("&");

  // Two-legged: no token secret
  const signingKey = `${encodeURIComponent(consumerSecret)}&`;

  const signature = createHmac("sha1", signingKey)
    .update(signatureBase)
    .digest("base64");

  const headerParts = Object.entries({ ...oauthParams, oauth_signature: signature })
    .map(([k, v]) => `${k}="${encodeURIComponent(v)}"`)
    .join(", ");

  return `OAuth realm="Schoology API", ${headerParts}`;
}

async function schoologyFetch(
  domain: string,
  path: string,
  consumerKey: string,
  consumerSecret: string,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const url = `${schoologyApiBase(domain)}${path}`;
  const authHeader = buildOauth1Header("GET", url, consumerKey, consumerSecret);
  const response = await fetch(url, {
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
    },
  });
  const data = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, data };
}

// ---

async function upsertAssignments(
  ownerId: string,
  source: "canvas" | "classroom" | "schoology",
  items: Array<{
    externalId: string;
    courseName: string | null;
    title: string;
    dueDate: string;
    url: string | null;
    description: string | null;
  }>,
): Promise<{ importedCount: number }> {
  if (items.length === 0) return { importedCount: 0 };

  const existing = await db
    .select({ externalId: assignments.externalId })
    .from(assignments)
    .where(
      and(
        eq(assignments.deviceId, ownerId),
        eq(assignments.source, source),
        inArray(
          assignments.externalId,
          items.map((i) => i.externalId),
        ),
      ),
    );
  const existingIds = new Set(existing.map((row) => row.externalId));
  const importedCount = items.filter((i) => !existingIds.has(i.externalId)).length;

  for (const item of items) {
    await db
      .insert(assignments)
      .values({
        deviceId: ownerId,
        source,
        externalId: item.externalId,
        courseName: item.courseName,
        title: item.title,
        dueDate: item.dueDate,
        url: item.url,
        description: item.description,
      })
      .onConflictDoUpdate({
        target: [assignments.deviceId, assignments.source, assignments.externalId],
        set: {
          courseName: item.courseName,
          title: item.title,
          dueDate: item.dueDate,
          url: item.url,
          description: item.description,
        },
      });
  }
  return { importedCount };
}

async function listOwnerAssignments(ownerId: string) {
  const rows = await db
    .select()
    .from(assignments)
    .where(eq(assignments.deviceId, ownerId));
  return rows
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map(serializeAssignment);
}

router.get("/integrations/status", async (req, res) => {
  const { deviceId } = GetIntegrationsStatusQueryParams.parse(req.query);
  const ownerId = resolveOwnerId(req, deviceId);
  res.json(await buildStatus(req, ownerId));
});

router.post("/integrations/canvas", async (req, res) => {
  const body = ConnectCanvasBody.parse(req.body);
  const ownerId = resolveOwnerId(req, body.deviceId);

  const baseUrl = normalizeCanvasBaseUrl(body.baseUrl);
  if (!baseUrl) {
    res.status(400).json({ message: "Enter a valid Canvas URL, e.g. https://myschool.instructure.com" });
    return;
  }
  if (!(await isPublicCanvasHost(new URL(baseUrl).hostname))) {
    res.status(400).json({ message: "That Canvas URL isn't reachable. Use your school's public Canvas address, e.g. https://myschool.instructure.com" });
    return;
  }

  const accessToken = body.accessToken.trim();
  if (!accessToken) {
    res.status(400).json({ message: "Access token is required" });
    return;
  }

  let check: Awaited<ReturnType<typeof canvasFetch>>;
  try {
    check = await canvasFetch(baseUrl, accessToken, "/api/v1/users/self");
  } catch {
    res.status(400).json({
      message: "Could not reach that Canvas URL. Double-check your school's Canvas address.",
    });
    return;
  }
  if (!check.ok) {
    res.status(400).json({
      message:
        check.status === 401
          ? "Canvas rejected that access token. Generate a new one in Canvas under Account → Settings → New Access Token."
          : `Canvas returned an error (HTTP ${check.status}). Double-check the URL and token.`,
    });
    return;
  }

  await db
    .insert(canvasConnections)
    .values({ ownerId, baseUrl, accessToken })
    .onConflictDoUpdate({
      target: canvasConnections.ownerId,
      set: { baseUrl, accessToken, updatedAt: new Date() },
    });

  res.json(await buildStatus(req, ownerId));
});

router.delete("/integrations/canvas", async (req, res) => {
  const { deviceId } = DisconnectCanvasQueryParams.parse(req.query);
  const ownerId = resolveOwnerId(req, deviceId);
  await db
    .delete(canvasConnections)
    .where(eq(canvasConnections.ownerId, ownerId));
  res.status(204).end();
});

type CanvasCourse = { id: number; name?: string; course_code?: string };
type CanvasAssignment = {
  id: number;
  name: string;
  due_at: string | null;
  html_url?: string;
  description?: string | null;
};

function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || null;
}

router.post("/integrations/canvas/import", async (req, res) => {
  const body = ImportCanvasAssignmentsBody.parse(req.body);
  const ownerId = resolveOwnerId(req, body.deviceId);

  const [connection] = await db
    .select()
    .from(canvasConnections)
    .where(eq(canvasConnections.ownerId, ownerId));
  if (!connection) {
    res.status(409).json({ message: "Canvas is not connected" });
    return;
  }
  if (!(await isPublicCanvasHost(new URL(connection.baseUrl).hostname))) {
    res.status(409).json({ message: "The saved Canvas URL is no longer valid. Reconnect Canvas." });
    return;
  }

  const coursesResult = await canvasFetch(
    connection.baseUrl,
    connection.accessToken,
    "/api/v1/courses?enrollment_state=active&per_page=50",
  );
  if (!coursesResult.ok) {
    res.status(502).json({
      message:
        coursesResult.status === 401
          ? "Canvas rejected the saved access token. Reconnect Canvas with a new token."
          : `Canvas returned an error while listing courses (HTTP ${coursesResult.status}).`,
    });
    return;
  }

  const courses = (coursesResult.data as CanvasCourse[]).filter(
    (c) => c && typeof c.id === "number",
  );
  const now = Date.now();
  const items: Array<{
    externalId: string;
    courseName: string | null;
    title: string;
    dueDate: string;
    url: string | null;
    description: string | null;
  }> = [];

  for (const course of courses) {
    const assignmentsResult = await canvasFetch(
      connection.baseUrl,
      connection.accessToken,
      `/api/v1/courses/${course.id}/assignments?per_page=100&order_by=due_at`,
    );
    if (!assignmentsResult.ok) continue;
    for (const a of assignmentsResult.data as CanvasAssignment[]) {
      if (!a?.due_at) continue;
      const due = Date.parse(a.due_at);
      if (Number.isNaN(due) || due < now) continue;
      items.push({
        externalId: String(a.id),
        courseName: course.name ?? course.course_code ?? null,
        title: a.name,
        dueDate: a.due_at,
        url: a.html_url ?? null,
        description: stripHtml(a.description),
      });
    }
  }

  const { importedCount } = await upsertAssignments(ownerId, "canvas", items);
  res.json({ importedCount, assignments: await listOwnerAssignments(ownerId) });
});

type ClassroomCourse = { id: string; name?: string; courseState?: string };
type ClassroomCourseWork = {
  id: string;
  title?: string;
  description?: string;
  alternateLink?: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours?: number; minutes?: number };
};

function classroomDueToIso(work: ClassroomCourseWork): string | null {
  const d = work.dueDate;
  if (!d) return null;
  const date = new Date(
    Date.UTC(
      d.year,
      d.month - 1,
      d.day,
      work.dueTime?.hours ?? 23,
      work.dueTime?.minutes ?? 59,
    ),
  );
  return date.toISOString();
}

router.post("/integrations/classroom/import", async (req, res) => {
  ImportClassroomAssignmentsBody.parse(req.body);

  const userId = getAuth(req)?.userId;
  if (!userId) {
    res.status(401).json({ message: "Sign in to import from Google Classroom" });
    return;
  }

  const [connection] = await db
    .select()
    .from(googleCalendarConnections)
    .where(eq(googleCalendarConnections.ownerId, userId));
  if (!connection) {
    res.status(409).json({ message: "Google account is not connected" });
    return;
  }

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(connection);
  } catch (err) {
    if (err instanceof GoogleReauthRequiredError) {
      await db
        .delete(googleCalendarConnections)
        .where(eq(googleCalendarConnections.id, connection.id));
      res.status(409).json({ message: "Google connection expired. Reconnect your Google account." });
      return;
    }
    throw err;
  }

  const coursesResponse = await fetch(
    "https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE&pageSize=50",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (coursesResponse.status === 403) {
    res.status(409).json({
      message:
        "Google Classroom access has not been granted yet. Reconnect your Google account to allow Classroom access.",
    });
    return;
  }
  if (!coursesResponse.ok) {
    res.status(502).json({
      message: `Google Classroom returned an error while listing courses (HTTP ${coursesResponse.status}).`,
    });
    return;
  }

  const coursesData = (await coursesResponse.json()) as {
    courses?: ClassroomCourse[];
  };
  const courses = coursesData.courses ?? [];
  const now = Date.now();
  const items: Array<{
    externalId: string;
    courseName: string | null;
    title: string;
    dueDate: string;
    url: string | null;
    description: string | null;
  }> = [];

  for (const course of courses) {
    const workResponse = await fetch(
      `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(course.id)}/courseWork?pageSize=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!workResponse.ok) continue;
    const workData = (await workResponse.json()) as {
      courseWork?: ClassroomCourseWork[];
    };
    for (const work of workData.courseWork ?? []) {
      if (!work?.id || !work.title) continue;
      const dueIso = classroomDueToIso(work);
      if (!dueIso) continue;
      if (Date.parse(dueIso) < now) continue;
      items.push({
        externalId: work.id,
        courseName: course.name ?? null,
        title: work.title,
        dueDate: dueIso,
        url: work.alternateLink ?? null,
        description: work.description?.trim() || null,
      });
    }
  }

  const { importedCount } = await upsertAssignments(userId, "classroom", items);
  res.json({ importedCount, assignments: await listOwnerAssignments(userId) });
});

// --- Schoology ---

router.post("/integrations/schoology", async (req, res) => {
  const body = ConnectSchoologyBody.parse(req.body);
  const ownerId = resolveOwnerId(req, body.deviceId);

  const domain = normalizeSchoologyDomain(body.domain);
  if (!domain) {
    res.status(400).json({
      message: "Enter a valid Schoology domain, e.g. api.schoology.com or lms.myschool.edu",
    });
    return;
  }
  if (!(await isPublicCanvasHost(domain))) {
    res.status(400).json({
      message: "That Schoology domain isn't reachable. Use your school's public Schoology address, e.g. api.schoology.com",
    });
    return;
  }

  const consumerKey = body.consumerKey.trim();
  const consumerSecret = body.consumerSecret.trim();
  if (!consumerKey || !consumerSecret) {
    res.status(400).json({ message: "Consumer key and secret are required" });
    return;
  }

  let check: { ok: boolean; status: number; data: unknown };
  try {
    check = await schoologyFetch(domain, "/users/me", consumerKey, consumerSecret);
  } catch {
    res.status(400).json({
      message: "Could not reach that Schoology domain. Double-check the domain and try again.",
    });
    return;
  }
  if (!check.ok) {
    res.status(400).json({
      message:
        check.status === 401
          ? "Schoology rejected those credentials. Double-check your consumer key and secret from Settings → API Access."
          : `Schoology returned an error (HTTP ${check.status}). Double-check the domain, key, and secret.`,
    });
    return;
  }

  await db
    .insert(schoologyConnections)
    .values({ ownerId, domain, consumerKey, consumerSecret })
    .onConflictDoUpdate({
      target: schoologyConnections.ownerId,
      set: { domain, consumerKey, consumerSecret, updatedAt: new Date() },
    });

  res.json(await buildStatus(req, ownerId));
});

router.delete("/integrations/schoology", async (req, res) => {
  const { deviceId } = DisconnectSchoologyQueryParams.parse(req.query);
  const ownerId = resolveOwnerId(req, deviceId);
  await db
    .delete(schoologyConnections)
    .where(eq(schoologyConnections.ownerId, ownerId));
  res.status(204).end();
});

type SchoologySection = {
  id: string;
  course_title?: string;
  section_title?: string;
};

type SchoologyAssignment = {
  id: string;
  title: string;
  due?: string;
  web_url?: string;
  description?: string;
};

function schoologyDueToIso(due: string | undefined): string | null {
  if (!due || due.trim() === "" || due === "0000-00-00 00:00:00") return null;
  // Schoology format: "YYYY-MM-DD HH:MM:SS" in UTC
  const iso = due.trim().replace(" ", "T") + "Z";
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return null;
  return new Date(ts).toISOString();
}

router.post("/integrations/schoology/import", async (req, res) => {
  const body = ImportSchoologyAssignmentsBody.parse(req.body);
  const ownerId = resolveOwnerId(req, body.deviceId);

  const [connection] = await db
    .select()
    .from(schoologyConnections)
    .where(eq(schoologyConnections.ownerId, ownerId));
  if (!connection) {
    res.status(409).json({ message: "Schoology is not connected" });
    return;
  }
  if (!(await isPublicCanvasHost(connection.domain))) {
    res.status(409).json({ message: "The saved Schoology domain is no longer valid. Reconnect Schoology." });
    return;
  }

  const sectionsResult = await schoologyFetch(
    connection.domain,
    "/sections?start=0&limit=200",
    connection.consumerKey,
    connection.consumerSecret,
  );
  if (!sectionsResult.ok) {
    res.status(502).json({
      message:
        sectionsResult.status === 401
          ? "Schoology rejected the saved credentials. Reconnect Schoology with a new key and secret."
          : `Schoology returned an error while listing sections (HTTP ${sectionsResult.status}).`,
    });
    return;
  }

  const sectionsData = sectionsResult.data as { section?: SchoologySection[] };
  const sections = sectionsData.section ?? [];
  const now = Date.now();
  const items: Array<{
    externalId: string;
    courseName: string | null;
    title: string;
    dueDate: string;
    url: string | null;
    description: string | null;
  }> = [];

  for (const section of sections) {
    const assignmentsResult = await schoologyFetch(
      connection.domain,
      `/sections/${section.id}/assignments?start=0&limit=200`,
      connection.consumerKey,
      connection.consumerSecret,
    );
    if (!assignmentsResult.ok) continue;
    const assignmentsData = assignmentsResult.data as { assignment?: SchoologyAssignment[] };
    for (const a of assignmentsData.assignment ?? []) {
      if (!a?.id || !a.title) continue;
      const dueIso = schoologyDueToIso(a.due);
      if (!dueIso) continue;
      if (Date.parse(dueIso) < now) continue;
      const courseName = [section.course_title, section.section_title]
        .filter(Boolean)
        .join(" – ") || null;
      items.push({
        externalId: a.id,
        courseName,
        title: a.title,
        dueDate: dueIso,
        url: a.web_url ?? null,
        description: stripHtml(a.description),
      });
    }
  }

  const { importedCount } = await upsertAssignments(ownerId, "schoology", items);
  res.json({ importedCount, assignments: await listOwnerAssignments(ownerId) });
});

// ---

router.get("/assignments", async (req, res) => {
  const { deviceId } = ListAssignmentsQueryParams.parse(req.query);
  const ownerId = resolveOwnerId(req, deviceId);
  res.json(await listOwnerAssignments(ownerId));
});

router.delete("/assignments/:id", async (req, res) => {
  const { id } = DeleteAssignmentParams.parse(req.params);
  const { deviceId } = DeleteAssignmentQueryParams.parse(req.query);
  const ownerId = resolveOwnerId(req, deviceId);
  const [existing] = await db
    .select()
    .from(assignments)
    .where(and(eq(assignments.id, id), eq(assignments.deviceId, ownerId)));
  if (!existing) {
    res.status(404).json({ message: "Assignment not found" });
    return;
  }
  await db
    .delete(assignments)
    .where(and(eq(assignments.id, id), eq(assignments.deviceId, ownerId)));
  res.status(204).end();
});

export default router;
