import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${BASE}/api`;

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

// ── User-facing ────────────────────────────────────────────────
export function useMyManualRequests() {
  return useQuery({
    queryKey: ["manual-requests", "mine"],
    queryFn: () => apiFetch("/manual-requests/mine"),
    retry: false,
  });
}

export function useManualRequest(id: string | undefined) {
  return useQuery({
    queryKey: ["manual-requests", id],
    queryFn: () => apiFetch(`/manual-requests/${id}`),
    enabled: !!id,
  });
}

export function useCreateManualRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      timetableDescription?: string;
      assignments?: unknown;
      preferences?: unknown;
      ownerEmail?: string;
    }) =>
      apiFetch("/manual-requests", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["manual-requests"] }),
  });
}

// ── Staff-facing ────────────────────────────────────────────────
export function useStaffRequests() {
  return useQuery({
    queryKey: ["staff", "requests"],
    queryFn: () => apiFetch("/staff/requests"),
  });
}

export function useStaffRequest(id: string | undefined) {
  return useQuery({
    queryKey: ["staff", "requests", id],
    queryFn: () => apiFetch(`/staff/requests/${id}`),
    enabled: !!id,
  });
}

export function useClaimRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/staff/requests/${id}/claim`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useSubmitResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      message?: string;
      scheduleContent?: string;
      graphicPath?: string;
    }) =>
      apiFetch(`/staff/requests/${id}/respond`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}

// ── Admin-facing ─────────────────────────────────────────────────
export function useMyRole() {
  return useQuery({
    queryKey: ["admin", "role"],
    queryFn: () => apiFetch("/admin/me/role"),
    retry: false,
  });
}

export function useStaffList() {
  return useQuery({
    queryKey: ["admin", "staff"],
    queryFn: () => apiFetch("/admin/staff"),
  });
}

export function useSearchUser(email: string) {
  return useQuery({
    queryKey: ["admin", "users", "search", email],
    queryFn: () => apiFetch(`/admin/users/search?email=${encodeURIComponent(email)}`),
    enabled: email.length > 3,
  });
}

export function useGrantEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { userId: string; email: string }) =>
      apiFetch("/admin/staff", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "staff"] }),
  });
}

export function useRevokeEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/admin/staff/${userId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "staff"] }),
  });
}

export function useAdminRequests() {
  return useQuery({
    queryKey: ["admin", "requests"],
    queryFn: () => apiFetch("/admin/requests"),
  });
}
