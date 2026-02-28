import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { insertBrandSchema, insertProductSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

type CreateProductInput = z.infer<typeof insertProductSchema>;
type UpdateProductInput = Partial<CreateProductInput>;

export function useProducts(search?: string, brandId?: number, status?: "ACTIVE" | "INACTIVE" | "ARCHIVED") {
  return useQuery({
    queryKey: [api.products.list.path, search, brandId, status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (brandId) params.append("brandId", brandId.toString());
      if (status) params.append("status", status);
      
      const url = `${api.products.list.path}?${params.toString()}`;
      const res = await apiRequest(api.products.list.method, url);
      
      return api.products.list.responses[200].parse(await res.json());
    },
  });
}

export function useProductByBarcode(barcode: string, enabled: boolean = true) {
  return useQuery({
    queryKey: [api.products.getByBarcode.path, barcode],
    queryFn: async () => {
      const url = buildUrl(api.products.getByBarcode.path, { barcode });
      const res = await apiRequest(api.products.getByBarcode.method, url);
      if (res.status === 404) return null;
      return api.products.getByBarcode.responses[200].parse(await res.json());
    },
    enabled: enabled && barcode.length > 0,
    retry: false,
  });
}

export function useBrands() {
  return useQuery({
    queryKey: [api.brands.list.path],
    queryFn: async () => {
      const res = await apiRequest(api.brands.list.method, api.brands.list.path);
      return api.brands.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof insertBrandSchema>) => {
      const validated = api.brands.create.input.parse(data);
      const res = await apiRequest(api.brands.create.method, api.brands.create.path, validated);
      return api.brands.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.brands.list.path] }),
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/brands/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.brands.list.path] }),
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<z.infer<typeof insertBrandSchema>>) => {
      const res = await apiRequest("PUT", `/api/brands/${id}`, data);
      return api.brands.list.responses[200].element.parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.brands.list.path] }),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateProductInput) => {
      const validated = api.products.create.input.parse(data);
      const res = await apiRequest(api.products.create.method, api.products.create.path, validated);
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
      const res = await apiRequest(api.products.update.method, url, validated);
      return api.products.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.products.list.path] }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: number; mode: "soft" | "hard" }) => {
      const url = buildUrl(api.products.delete.path, { id: params.id });
      await apiRequest(api.products.delete.method, `${url}?mode=${params.mode}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.pos.products.search.path] });
      queryClient.invalidateQueries({ queryKey: [api.pos.filters.path] });
    },
  });
}

export function useProductDeleteInfo(productId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ["productDeleteInfo", productId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/products/${productId}/delete-info`);
      return await res.json();
    },
    enabled: enabled && productId != null,
    retry: false,
  });
}
