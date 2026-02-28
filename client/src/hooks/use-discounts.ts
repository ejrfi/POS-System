import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { insertDiscountSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

type CreateDiscountInput = z.infer<typeof insertDiscountSchema>;
type UpdateDiscountInput = Partial<CreateDiscountInput>;

async function parseResponse<T>(res: Response, schema: z.ZodType<T>): Promise<T> {
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error("Invalid server response: Expected JSON but received HTML/Text. The server might be down or misconfigured.");
  }
  const json = await res.json();
  return schema.parse(json);
}

export function useDiscounts() {
  return useQuery({
    queryKey: [api.discounts.list.path],
    queryFn: async () => {
      const res = await apiRequest(api.discounts.list.method, api.discounts.list.path);
      return parseResponse(res, api.discounts.list.responses[200]);
    },
  });
}

export function useDiscountsPaged(params?: {
  active?: boolean;
  search?: string;
  status?: "ACTIVE" | "INACTIVE";
  appliesTo?: "product" | "category" | "global" | "customer";
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "name" | "priorityLevel" | "startDate" | "endDate";
  sortDir?: "asc" | "desc";
}) {
  return useQuery({
    queryKey: [api.discounts.list.path, params],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params?.active != null) qs.set("active", String(params.active));
      if (params?.search) qs.set("search", params.search);
      if (params?.status) qs.set("status", params.status);
      if (params?.appliesTo) qs.set("appliesTo", params.appliesTo);
      if (params?.page) qs.set("page", String(params.page));
      if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
      if (params?.sortBy) qs.set("sortBy", params.sortBy);
      if (params?.sortDir) qs.set("sortDir", params.sortDir);
      const url = qs.size ? `${api.discounts.list.path}?${qs.toString()}` : api.discounts.list.path;
      const res = await apiRequest(api.discounts.list.method, url);
      return parseResponse(res, api.discounts.list.responses[200]);
    },
  });
}

export function useCreateDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateDiscountInput) => {
      const res = await apiRequest(api.discounts.create.method, api.discounts.create.path, data);
      return parseResponse(res, api.discounts.create.responses[201]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.discounts.list.path] }),
  });
}

export function useUpdateDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & UpdateDiscountInput) => {
      const url = buildUrl(api.discounts.update.path, { id });
      const res = await apiRequest(api.discounts.update.method, url, data);
      return parseResponse(res, api.discounts.update.responses[200]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.discounts.list.path] }),
  });
}

export function useDeleteDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.discounts.delete.path, { id });
      await apiRequest(api.discounts.delete.method, url);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.discounts.list.path] }),
  });
}
