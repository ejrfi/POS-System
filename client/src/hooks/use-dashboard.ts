import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";

export function useDashboardOverview(params?: { days?: number; months?: number; topLimit?: number; lowStockThreshold?: number }) {
  return useQuery({
    queryKey: [api.dashboard.overview.path, params],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params?.days != null) qs.append("days", String(params.days));
      if (params?.months != null) qs.append("months", String(params.months));
      if (params?.topLimit != null) qs.append("topLimit", String(params.topLimit));
      if (params?.lowStockThreshold != null) qs.append("lowStockThreshold", String(params.lowStockThreshold));
      const url = qs.toString() ? `${api.dashboard.overview.path}?${qs.toString()}` : api.dashboard.overview.path;
      const res = await apiRequest(api.dashboard.overview.method, url);
      return api.dashboard.overview.responses[200].parse(await res.json());
    },
    refetchInterval: 5000,
  });
}
