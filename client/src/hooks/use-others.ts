import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { insertBrandSchema, insertCategorySchema, insertCustomerSchema, insertSupplierSchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

// BRANDS
export function useBrands() {
  return useQuery({
    queryKey: [api.brands.list.path],
    queryFn: async () => {
      const res = await apiRequest(api.brands.list.method, `${api.brands.list.path}?includeInactive=1`);
      return api.brands.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof insertBrandSchema>) => {
      const res = await apiRequest(api.brands.create.method, api.brands.create.path, data);
      return api.brands.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.brands.list.path] }),
  });
}

// CATEGORIES
export function useCategories() {
  return useQuery({
    queryKey: [api.categories.list.path],
    queryFn: async () => {
      const res = await apiRequest(api.categories.list.method, api.categories.list.path);
      return api.categories.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof insertCategorySchema>) => {
      const res = await apiRequest(api.categories.create.method, api.categories.create.path, data);
      return api.categories.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.categories.list.path] }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<z.infer<typeof insertCategorySchema>> & { id: number }) => {
      const res = await apiRequest("PUT", `/api/categories/${id}`, data);
      return api.categories.list.responses[200].element.parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.categories.list.path] }),
  });
}

export function useDeactivateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.categories.list.path] }),
  });
}

// SUPPLIERS
export function useSuppliers() {
  return useQuery({
    queryKey: [api.suppliers.list.path],
    queryFn: async () => {
      const res = await apiRequest(api.suppliers.list.method, api.suppliers.list.path);
      return api.suppliers.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof insertSupplierSchema>) => {
      const res = await apiRequest(api.suppliers.create.method, api.suppliers.create.path, data);
      return api.suppliers.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.suppliers.list.path] }),
  });
}

// CUSTOMERS
export function useCustomers(params?: {
  search?: string;
  status?: "ACTIVE" | "INACTIVE";
  tierLevel?: "REGULAR" | "SILVER" | "GOLD" | "PLATINUM";
  customerType?: "regular" | "member" | "vip";
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "name" | "phone" | "totalPoints" | "totalSpending" | "tierLevel";
  sortDir?: "asc" | "desc";
}) {
  return useQuery({
    queryKey: [api.customers.list.path, params],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params?.search) qs.set("search", params.search);
      if (params?.status) qs.set("status", params.status);
      if (params?.tierLevel) qs.set("tierLevel", params.tierLevel);
      if (params?.customerType) qs.set("customerType", params.customerType);
      if (params?.page) qs.set("page", String(params.page));
      if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
      if (params?.sortBy) qs.set("sortBy", params.sortBy);
      if (params?.sortDir) qs.set("sortDir", params.sortDir);
      const url = qs.size ? `${api.customers.list.path}?${qs.toString()}` : api.customers.list.path;
      const res = await apiRequest(api.customers.list.method, url);
      return api.customers.list.responses[200].parse(await res.json());
    },
  });
}

export function useCustomerTransactions(customerId: number | null, params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: [api.customers.transactions.path, customerId, params],
    queryFn: async () => {
      if (!customerId) return null;
      const qs = new URLSearchParams();
      if (params?.page) qs.set("page", String(params.page));
      if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
      const url = qs.size ? `/api/customers/${customerId}/transactions?${qs.toString()}` : `/api/customers/${customerId}/transactions`;
      const res = await apiRequest("GET", url);
      return api.customers.transactions.responses[200].parse(await res.json());
    },
    enabled: !!customerId,
  });
}

export function useCustomerPointHistory(customerId: number | null, params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: [api.customers.points.path, customerId, params],
    queryFn: async () => {
      if (!customerId) return null;
      const qs = new URLSearchParams();
      if (params?.page) qs.set("page", String(params.page));
      if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
      const url = qs.size ? `/api/customers/${customerId}/points?${qs.toString()}` : `/api/customers/${customerId}/points`;
      const res = await apiRequest("GET", url);
      return api.customers.points.responses[200].parse(await res.json());
    },
    enabled: !!customerId,
  });
}

export function useLoyaltySettings() {
  return useQuery({
    queryKey: [api.loyalty.settings.get.path],
    queryFn: async () => {
      const res = await apiRequest(api.loyalty.settings.get.method, api.loyalty.settings.get.path);
      return api.loyalty.settings.get.responses[200].parse(await res.json());
    },
  });
}

export function useUpdateLoyaltySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.loyalty.settings.update.input>) => {
      const res = await apiRequest(api.loyalty.settings.update.method, api.loyalty.settings.update.path, data);
      return api.loyalty.settings.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.loyalty.settings.get.path] }),
  });
}

export function useAppSettings() {
  return useQuery({
    queryKey: [api.appSettings.get.path],
    queryFn: async () => {
      const res = await apiRequest(api.appSettings.get.method, api.appSettings.get.path);
      return api.appSettings.get.responses[200].parse(await res.json());
    },
  });
}

export function useUpdateAppSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.appSettings.update.input>) => {
      const res = await apiRequest(api.appSettings.update.method, api.appSettings.update.path, data);
      return api.appSettings.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.appSettings.get.path] }),
  });
}

export function useUsers(params?: { search?: string }, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [api.users.list.path, params],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params?.search) qs.set("search", params.search);
      const url = qs.size ? `${api.users.list.path}?${qs.toString()}` : api.users.list.path;
      const res = await apiRequest(api.users.list.method, url);
      return api.users.list.responses[200].parse(await res.json());
    },
    enabled: options?.enabled ?? true,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.users.create.input>) => {
      const res = await apiRequest(api.users.create.method, api.users.create.path, data);
      return api.users.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.users.list.path] }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: z.infer<typeof api.users.update.input> & { id: number }) => {
      const res = await apiRequest(api.users.update.method, api.users.update.path.replace(":id", String(id)), data);
      return api.users.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.users.list.path] }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(api.users.delete.method, api.users.delete.path.replace(":id", String(id)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.users.list.path] }),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof insertCustomerSchema>) => {
      const res = await apiRequest(api.customers.create.method, api.customers.create.path, data);
      return api.customers.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.customers.list.path] }),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<z.infer<typeof insertCustomerSchema>> & { id: number }) => {
      const res = await apiRequest(api.customers.update.method, api.customers.update.path.replace(":id", id.toString()), data);
      return api.customers.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.customers.list.path] }),
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(api.customers.delete.method, api.customers.delete.path.replace(":id", id.toString()));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.customers.list.path] }),
  });
}
