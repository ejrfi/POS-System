import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type CheckoutRequest } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";

export function useSales(filters?: {
  startDate?: string;
  endDate?: string;
  customerId?: number;
  tier?: string;
  paymentMethod?: string;
  status?: string;
  cashierId?: number;
  usedPoints?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: [api.sales.list.path, filters],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (filters?.startDate) qs.append("startDate", filters.startDate);
      if (filters?.endDate) qs.append("endDate", filters.endDate);
      if (filters?.customerId != null) qs.append("customerId", String(filters.customerId));
      if (filters?.tier) qs.append("tier", filters.tier);
      if (filters?.paymentMethod) qs.append("paymentMethod", filters.paymentMethod);
      if (filters?.status) qs.append("status", filters.status);
      if (filters?.cashierId != null) qs.append("cashierId", String(filters.cashierId));
      if (filters?.usedPoints != null) qs.append("usedPoints", String(filters.usedPoints));
      if (filters?.search) qs.append("search", filters.search);
      if (filters?.page != null) qs.append("page", String(filters.page));
      if (filters?.pageSize != null) qs.append("pageSize", String(filters.pageSize));
      const url = qs.toString() ? `${api.sales.list.path}?${qs.toString()}` : api.sales.list.path;
      const res = await apiRequest(api.sales.list.method, url);
      return api.sales.list.responses[200].parse(await res.json());
    },
  });
}

export function useSale(id: number | null) {
  return useQuery({
    queryKey: [api.sales.get.path, id],
    queryFn: async () => {
      if (!id) return null;
      const path = api.sales.get.path.replace(":id", String(id));
      const res = await apiRequest(api.sales.get.method, path);
      return await res.json(); // Complex type, skip parsing for now or strict parse
    },
    enabled: !!id,
  });
}

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CheckoutRequest) => {
      const res = await apiRequest(api.sales.checkout.method, api.sales.checkout.path, data);
      return api.sales.checkout.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sales.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.reports.daily.path] });
      queryClient.invalidateQueries({ queryKey: [api.cashierShifts.active.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] }); 
    },
  });
}

export function useSuspendedSales() {
  return useQuery({
    queryKey: [api.suspendedSales.list.path],
    queryFn: async () => {
      const res = await apiRequest(api.suspendedSales.list.method, api.suspendedSales.list.path);
      return api.suspendedSales.list.responses[200].parse(await res.json());
    },
  });
}

export function useSuspendSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CheckoutRequest & { note?: string }) => {
      const res = await apiRequest(api.suspendedSales.create.method, api.suspendedSales.create.path, data);
      return api.suspendedSales.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.suspendedSales.list.path] });
    },
  });
}

export function useRecallSuspendedSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const path = api.suspendedSales.recall.path.replace(":id", String(id));
      const res = await apiRequest(api.suspendedSales.recall.method, path);
      return api.suspendedSales.recall.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.suspendedSales.list.path] });
    },
  });
}

export function useDeleteSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const path = api.sales.delete.path.replace(":id", String(id));
      await apiRequest(api.sales.delete.method, path);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sales.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.reports.daily.path] });
    },
  });
}

export function useCreateReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { saleId: number, items: any[], reason: string, refundMethod?: string }) => {
      const res = await apiRequest(api.returns.create.method, api.returns.create.path, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.returns.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.sales.list.path] }); // Maybe updated?
      queryClient.invalidateQueries({ queryKey: ["/api/products"] }); // Stock restored
    },
  });
}

export function useReturns(filters?: { startDate?: string; endDate?: string; status?: string; search?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: [api.returns.list.path, filters],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (filters?.startDate) qs.append("startDate", filters.startDate);
      if (filters?.endDate) qs.append("endDate", filters.endDate);
      if (filters?.status) qs.append("status", filters.status);
      if (filters?.search) qs.append("search", filters.search);
      if (filters?.page != null) qs.append("page", String(filters.page));
      if (filters?.pageSize != null) qs.append("pageSize", String(filters.pageSize));
      const url = qs.toString() ? `${api.returns.list.path}?${qs.toString()}` : api.returns.list.path;
      const res = await apiRequest(api.returns.list.method, url);
      return api.returns.list.responses[200].parse(await res.json());
    },
    // Adding staleTime to prevent excessive fetching
    staleTime: 5000,
  });
}

export function useDeleteReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const path = api.returns.delete.path.replace(":id", String(id));
      await apiRequest(api.returns.delete.method, path);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.returns.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.sales.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });
}

export function useDailyReport() {
  return useQuery({
    queryKey: [api.reports.daily.path],
    queryFn: async () => {
      const res = await apiRequest(api.reports.daily.method, api.reports.daily.path);
      return api.reports.daily.responses[200].parse(await res.json());
    },
  });
}

export function useItemSales(filters?: { startDate?: string, endDate?: string, brandId?: number }) {
  return useQuery({
    queryKey: [api.reports.items.path, filters],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (filters?.startDate) qs.append("startDate", filters.startDate);
      if (filters?.endDate) qs.append("endDate", filters.endDate);
      if (filters?.brandId) qs.append("brandId", String(filters.brandId));
      const url = qs.toString() ? `${api.reports.items.path}?${qs.toString()}` : api.reports.items.path;
      const res = await apiRequest(api.reports.items.method, url);
      return api.reports.items.responses[200].parse(await res.json());
    },
  });
}

export function useReportSummary(filters?: { startDate?: string; endDate?: string; brandId?: number }) {
  return useQuery({
    queryKey: [api.reports.summary.path, filters],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (filters?.startDate) qs.append("startDate", filters.startDate);
      if (filters?.endDate) qs.append("endDate", filters.endDate);
      if (filters?.brandId != null) qs.append("brandId", String(filters.brandId));
      const url = qs.toString() ? `${api.reports.summary.path}?${qs.toString()}` : api.reports.summary.path;
      const res = await apiRequest(api.reports.summary.method, url);
      return api.reports.summary.responses[200].parse(await res.json());
    },
  });
}

export function useSalesReport(filters?: { startDate?: string; endDate?: string; groupBy?: "day" | "week" | "month"; cashierId?: number; paymentMethod?: string; tier?: string; brandId?: number }) {
  return useQuery({
    queryKey: [api.reports.sales.path, filters],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (filters?.startDate) qs.append("startDate", filters.startDate);
      if (filters?.endDate) qs.append("endDate", filters.endDate);
      if (filters?.groupBy) qs.append("groupBy", filters.groupBy);
      if (filters?.cashierId != null) qs.append("cashierId", String(filters.cashierId));
      if (filters?.paymentMethod) qs.append("paymentMethod", filters.paymentMethod);
      if (filters?.tier) qs.append("tier", filters.tier);
      if (filters?.brandId != null) qs.append("brandId", String(filters.brandId));
      const url = qs.toString() ? `${api.reports.sales.path}?${qs.toString()}` : api.reports.sales.path;
      const res = await apiRequest(api.reports.sales.method, url);
      return api.reports.sales.responses[200].parse(await res.json());
    },
  });
}

export function useCustomerReport(filters?: { startDate?: string; endDate?: string; limit?: number; brandId?: number }) {
  return useQuery({
    queryKey: [api.reports.customers.path, filters],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (filters?.startDate) qs.append("startDate", filters.startDate);
      if (filters?.endDate) qs.append("endDate", filters.endDate);
      if (filters?.limit != null) qs.append("limit", String(filters.limit));
      if (filters?.brandId != null) qs.append("brandId", String(filters.brandId));
      const url = qs.toString() ? `${api.reports.customers.path}?${qs.toString()}` : api.reports.customers.path;
      const res = await apiRequest(api.reports.customers.method, url);
      return api.reports.customers.responses[200].parse(await res.json());
    },
  });
}

export function useProductReport(filters?: { startDate?: string; endDate?: string; limit?: number; brandId?: number }) {
  return useQuery({
    queryKey: [api.reports.products.path, filters],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (filters?.startDate) qs.append("startDate", filters.startDate);
      if (filters?.endDate) qs.append("endDate", filters.endDate);
      if (filters?.limit != null) qs.append("limit", String(filters.limit));
      if (filters?.brandId != null) qs.append("brandId", String(filters.brandId));
      const url = qs.toString() ? `${api.reports.products.path}?${qs.toString()}` : api.reports.products.path;
      const res = await apiRequest(api.reports.products.method, url);
      return api.reports.products.responses[200].parse(await res.json());
    },
  });
}

export function useReturnReport(filters?: { startDate?: string; endDate?: string; brandId?: number }) {
  return useQuery({
    queryKey: [api.reports.returns.path, filters],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (filters?.startDate) qs.append("startDate", filters.startDate);
      if (filters?.endDate) qs.append("endDate", filters.endDate);
      if (filters?.brandId != null) qs.append("brandId", String(filters.brandId));
      const url = qs.toString() ? `${api.reports.returns.path}?${qs.toString()}` : api.reports.returns.path;
      const res = await apiRequest(api.reports.returns.method, url);
      return api.reports.returns.responses[200].parse(await res.json());
    },
  });
}
