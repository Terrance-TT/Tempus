import { useQuery, useMutation } from "@tanstack/react-query";
import { useDeviceId } from "./use-device-id";

// API calls use root-relative "/api" paths (same as the shared api client) —
// the platform proxy routes them to the API server. BASE_URL is the frontend's
// own path prefix and must NOT be prepended, or requests hit the Vite dev
// server and get HTML back. VITE_API_BASE_URL overrides for cross-origin setups.
const BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "").replace(/\/+$/, "");

export type SubscriptionStatus = {
  isPro: boolean;
  scheduleCount: number;
  scheduleLimit: number;
};

export function useSubscriptionStatus() {
  const deviceId = useDeviceId();
  return useQuery<SubscriptionStatus>({
    queryKey: ["subscription-status", deviceId],
    queryFn: async () => {
      if (!deviceId) return { isPro: false, scheduleCount: 0, scheduleLimit: 2 };
      const res = await fetch(
        `${BASE}/api/subscription/status?deviceId=${encodeURIComponent(deviceId)}`,
        { credentials: "include" },
      );
      if (!res.ok) return { isPro: false, scheduleCount: 0, scheduleLimit: 2 };
      return res.json();
    },
    enabled: !!deviceId,
    staleTime: 30_000,
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: async (priceId: string) => {
      const res = await fetch(`${BASE}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ priceId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error ?? "Failed to start checkout");
      }
      return res.json() as Promise<{ url: string }>;
    },
  });
}

export function useManageSubscription() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/api/customer-portal`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to open billing portal");
      return res.json() as Promise<{ url: string }>;
    },
  });
}

export function useProProducts() {
  return useQuery({
    queryKey: ["stripe-products"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/products`, { credentials: "include" });
      if (!res.ok) return [];
      const data: { data: Array<{ id: string; name: string; description: string; prices: Array<{ id: string; unit_amount: number; currency: string; recurring: { interval: string } }> }> } =
        await res.json();
      return data.data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}
