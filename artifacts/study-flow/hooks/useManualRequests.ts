import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type CreateManualRequestBody = {
  timetableDescription?: string;
  assignments?: unknown;
  preferences?: unknown;
  ownerEmail?: string;
};

type ManualResponse = {
  id: string;
  message: string | null;
  scheduleContent: string | null;
  graphicPath: string | null;
  sentAt: string;
};

type ManualRequest = {
  id: string;
  ownerEmail: string | null;
  timetableDescription: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  createdAt: string;
  response: ManualResponse | null;
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export function useCreateManualRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateManualRequestBody) =>
      apiFetch<{ data: ManualRequest }>("/manual-requests", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["manual-requests"] }),
  });
}

export function useManualRequest(id: string | null) {
  return useQuery({
    queryKey: ["manual-requests", id],
    queryFn: () => apiFetch<{ data: ManualRequest }>(`/manual-requests/${id}`),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      return status === "pending" || status === "in_progress" ? 15000 : false;
    },
  });
}
