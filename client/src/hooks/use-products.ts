import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { insertProductSchema } from "@shared/schema";

type CreateProductInput = z.infer<typeof insertProductSchema>;
type UpdateProductInput = Partial<CreateProductInput>;

export function useProducts(search?: string, brandId?: number) {
  return useQuery({
    queryKey: [api.products.list.path, search, brandId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (brandId) params.append("brandId", brandId.toString());
      
      const url = `${api.products.list.path}?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products");
      
      return api.products.list.responses[200].parse(await res.json());
    },
  });
}

export function useProductByBarcode(barcode: string, enabled: boolean = true) {
  return useQuery({
    queryKey: [api.products.getByBarcode.path, barcode],
    queryFn: async () => {
      const url = buildUrl(api.products.getByBarcode.path, { barcode });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch product");
      return api.products.getByBarcode.responses[200].parse(await res.json());
    },
    enabled: enabled && barcode.length > 0,
    retry: false,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateProductInput) => {
      const validated = api.products.create.input.parse(data);
      const res = await fetch(api.products.create.path, {
        method: api.products.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create product");
      return api.products.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.products.list.path] }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & UpdateProductInput) => {
      const validated = api.products.update.input.parse(data);
      const url = buildUrl(api.products.update.path, { id });
      const res = await fetch(url, {
        method: api.products.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update product");
      return api.products.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.products.list.path] }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.products.delete.path, { id });
      const res = await fetch(url, { 
        method: api.products.delete.method,
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to delete product");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.products.list.path] }),
  });
}
