import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type CheckoutRequest } from "@shared/routes";

export function useSales() {
  return useQuery({
    queryKey: [api.sales.list.path],
    queryFn: async () => {
      const res = await fetch(api.sales.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sales history");
      return api.sales.list.responses[200].parse(await res.json());
    },
  });
}

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CheckoutRequest) => {
      // Data is already validated by schema in component usually, but double check
      const res = await fetch(api.sales.checkout.path, {
        method: api.sales.checkout.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Checkout failed");
      return api.sales.checkout.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sales.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.reports.daily.path] });
      // Products stock changes, so invalidate products too
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] }); 
    },
  });
}

export function useDailyReport() {
  return useQuery({
    queryKey: [api.reports.daily.path],
    queryFn: async () => {
      const res = await fetch(api.reports.daily.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch daily report");
      return api.reports.daily.responses[200].parse(await res.json());
    },
  });
}
