import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";

export function useActiveShift() {
  return useQuery({
    queryKey: [api.cashierShifts.active.path],
    queryFn: async () => {
      const res = await apiRequest(api.cashierShifts.active.method, api.cashierShifts.active.path);
      return api.cashierShifts.active.responses[200].parse(await res.json());
    },
  });
}

export function useOpenShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { openingCash: number; note?: string; terminalName: string; clientOpenedAt?: string }) => {
      const res = await apiRequest(api.cashierShifts.open.method, api.cashierShifts.open.path, data);
      return api.cashierShifts.open.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.cashierShifts.active.path] });
    },
  });
}

export function useCloseShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { actualCash: number; closeNote?: string }) => {
      const res = await apiRequest(api.cashierShifts.close.method, api.cashierShifts.close.path, data);
      return api.cashierShifts.close.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.cashierShifts.active.path] });
      queryClient.invalidateQueries({ queryKey: [api.sales.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.reports.daily.path] });
    },
  });
}

export function useApproveShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: number; approvalNote?: string }) => {
      const path = api.cashierShifts.approve.path.replace(":id", String(params.id));
      const res = await apiRequest(api.cashierShifts.approve.method, path, { approvalNote: params.approvalNote });
      return api.cashierShifts.approve.responses[200].parse(await res.json());
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: [api.cashierShifts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.cashierShifts.summary.path, vars.id] });
    },
  });
}

export function useCashierShifts(filters?: { startDate?: string; endDate?: string; cashierName?: string; role?: string; status?: "OPEN" | "ACTIVE" | "CLOSED"; approvalStatus?: "NONE" | "PENDING" | "APPROVED" | "REJECTED"; diffLargeOnly?: boolean; search?: string }) {
  return useQuery({
    queryKey: [api.cashierShifts.list.path, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append("startDate", filters.startDate);
      if (filters?.endDate) params.append("endDate", filters.endDate);
      if (filters?.cashierName) params.append("cashierName", filters.cashierName);
      if (filters?.role) params.append("role", filters.role);
      if (filters?.status) params.append("status", filters.status);
      if (filters?.approvalStatus) params.append("approvalStatus", filters.approvalStatus);
      if (filters?.diffLargeOnly != null) params.append("diffLargeOnly", String(filters.diffLargeOnly));
      if (filters?.search) params.append("search", filters.search);
      const url = params.toString() ? `${api.cashierShifts.list.path}?${params.toString()}` : api.cashierShifts.list.path;
      const res = await apiRequest(api.cashierShifts.list.method, url);
      return api.cashierShifts.list.responses[200].parse(await res.json());
    },
    refetchInterval: 5000,
  });
}

export function useCashierShiftSummary(id: number | null) {
  return useQuery({
    queryKey: [api.cashierShifts.summary.path, id],
    queryFn: async () => {
      if (!id) return null;
      const path = api.cashierShifts.summary.path.replace(":id", String(id));
      const res = await apiRequest(api.cashierShifts.summary.method, path);
      return api.cashierShifts.summary.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCashierShiftTransactions(id: number | null) {
  return useQuery({
    queryKey: [api.cashierShifts.transactions.path, id],
    queryFn: async () => {
      if (!id) return [];
      const path = api.cashierShifts.transactions.path.replace(":id", String(id));
      const res = await apiRequest(api.cashierShifts.transactions.method, path);
      return api.cashierShifts.transactions.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}
