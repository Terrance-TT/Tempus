import type { Request } from "express";
import { eq } from "drizzle-orm";
import { db, googleCalendarConnections } from "@workspace/db";

const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const GOOGLE_CLASSROOM_SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
];
export const GOOGLE_OAUTH_SCOPES = [
  GOOGLE_CALENDAR_SCOPE,
  ...GOOGLE_CLASSROOM_SCOPES,
].join(" ");
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getRedirectUri(req: Request): string {
  const protocol = req.headers["x-forwarded-proto"]?.toString().split(",")[0] ?? req.protocol;
  // Replit (and most reverse proxies) set X-Forwarded-Host for the public hostname;
  // fall back to the Host header if not present.
  const host =
    req.headers["x-forwarded-host"]?.toString().split(",")[0] ??
    req.get("host");
  return `${protocol}://${host}/api/google-calendar/callback`;
}

export function buildGoogleAuthUrl(req: Request, state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: getRedirectUri(req),
    response_type: "code",
    scope: GOOGLE_OAUTH_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

export async function exchangeCodeForTokens(
  req: Request,
  code: string,
): Promise<GoogleTokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      code,
      grant_type: "authorization_code",
      redirect_uri: getRedirectUri(req),
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to exchange Google auth code: ${await response.text()}`);
  }
  return response.json() as Promise<GoogleTokenResponse>;
}

async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new GoogleReauthRequiredError(text);
  }
  return response.json() as Promise<GoogleTokenResponse>;
}

export class GoogleReauthRequiredError extends Error {}

/**
 * Returns a valid access token for the given connection, transparently
 * refreshing (and persisting) it if it has expired. Throws
 * GoogleReauthRequiredError if the refresh token has been revoked and the
 * user needs to reconnect.
 */
export async function getValidAccessToken(
  connection: typeof googleCalendarConnections.$inferSelect,
): Promise<string> {
  const isExpired = connection.expiresAt.getTime() <= Date.now() + 60_000;
  if (!isExpired) {
    return connection.accessToken;
  }

  const refreshed = await refreshAccessToken(connection.refreshToken);
  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

  await db
    .update(googleCalendarConnections)
    .set({
      accessToken: refreshed.access_token,
      expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(googleCalendarConnections.id, connection.id));

  return refreshed.access_token;
}

export type GoogleCalendarEventBody = {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  recurrence?: string[];
};

async function calendarFetch(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(`${GOOGLE_CALENDAR_API}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
  });
}

export async function insertCalendarEvent(
  accessToken: string,
  body: GoogleCalendarEventBody,
): Promise<{ id: string }> {
  const response = await calendarFetch(accessToken, "", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Failed to create calendar event: ${await response.text()}`);
  }
  return response.json() as Promise<{ id: string }>;
}

export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  body: GoogleCalendarEventBody,
): Promise<{ id: string }> {
  const response = await calendarFetch(accessToken, `/${eventId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    // The event may have been deleted on the user's calendar directly.
    // Signal the caller to recreate it instead of failing the whole sync.
    if (response.status === 404 || response.status === 410) {
      return insertCalendarEvent(accessToken, body);
    }
    throw new Error(`Failed to update calendar event: ${await response.text()}`);
  }
  return response.json() as Promise<{ id: string }>;
}

export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string,
): Promise<void> {
  const response = await calendarFetch(accessToken, `/${eventId}`, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 404 && response.status !== 410 && response.status !== 204) {
    throw new Error(`Failed to delete calendar event: ${await response.text()}`);
  }
}

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const RRULE_DAY: Record<string, string> = {
  mon: "MO",
  tue: "TU",
  wed: "WE",
  thu: "TH",
  fri: "FR",
  sat: "SA",
  sun: "SU",
};

/** The date (within the current Mon-Sun week) for a given day-of-week. */
export function dateForDayOfWeek(day: string): Date {
  const targetIdx = DAY_ORDER.indexOf(day as (typeof DAY_ORDER)[number]);
  const today = new Date();
  const todayIdx = (today.getDay() + 6) % 7; // Mon=0 .. Sun=6
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - todayIdx);
  return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + targetIdx);
}

function toLocalIso(date: Date, time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const withTime = new Date(date);
  withTime.setHours(hours, minutes, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${withTime.getFullYear()}-${pad(withTime.getMonth() + 1)}-${pad(withTime.getDate())}T${pad(withTime.getHours())}:${pad(withTime.getMinutes())}:00`;
}

export function buildEventBody(
  block: { day: string; startTime: string; endTime: string; title: string; notes?: string | null },
  scope: "day" | "week",
  timeZone: string,
): GoogleCalendarEventBody {
  const date = dateForDayOfWeek(block.day);
  const endDate = block.endTime <= block.startTime
    ? new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
    : date;

  return {
    summary: block.title,
    description: block.notes ?? undefined,
    start: { dateTime: toLocalIso(date, block.startTime), timeZone },
    end: { dateTime: toLocalIso(endDate, block.endTime), timeZone },
    recurrence: scope === "week" ? [`RRULE:FREQ=WEEKLY;BYDAY=${RRULE_DAY[block.day]}`] : undefined,
  };
}
