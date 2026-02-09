import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { insertBrandSchema, insertCustomerSchema } from "@shared/schema";
import { z } from "zod";

// BRANDS
export function useBrands() {
  return useQuery({
    queryKey: [api.brands.list.path],
    queryFn: async () => {
      const res = await fetch(api.brands.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch brands");
      return api.brands.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof insertBrandSchema>) => {
      const res = await fetch(api.brands.create.path, {
        method: api.brands.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create brand");
      return api.brands.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.brands.list.path] }),
  });
}

// CUSTOMERS
export function useCustomers(search?: string) {
  return useQuery({
    queryKey: [api.customers.list.path, search],
    queryFn: async () => {
      const url = search 
        ? `${api.customers.list.path}?search=${search}` 
        : api.customers.list.path;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch customers");
      return api.customers.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof insertCustomerSchema>) => {
      const res = await fetch(api.customers.create.path, {
        method: api.customers.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create customer");
      return api.customers.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.customers.list.path] }),
  });
}
