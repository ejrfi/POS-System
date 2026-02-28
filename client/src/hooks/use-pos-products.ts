import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";

export type PosProductFilters = {
  q?: string;
  brandId?: number;
  categoryId?: number;
  supplierId?: number;
  stockStatus?: "all" | "in" | "low" | "out";
  minPrice?: number;
  maxPrice?: number;
  sort?: "relevance" | "nameAsc" | "priceAsc" | "priceDesc" | "stockDesc" | "bestSelling30d";
  limit?: number;
};

export function usePosFilters() {
  return useQuery({
    queryKey: [api.pos.filters.path],
    queryFn: async () => {
      const res = await apiRequest(api.pos.filters.method, api.pos.filters.path);
      return api.pos.filters.responses[200].parse(await res.json());
    },
    staleTime: 60_000,
  });
}

export function usePosProducts(filters: PosProductFilters) {
  const limit = Math.min(200, Math.max(1, filters.limit ?? 48));

  return useInfiniteQuery({
    queryKey: [api.pos.products.search.path, { ...filters, limit }],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (filters.q) params.set("q", filters.q);
      if (filters.brandId != null) params.set("brandId", String(filters.brandId));
      if (filters.categoryId != null) params.set("categoryId", String(filters.categoryId));
      if (filters.supplierId != null) params.set("supplierId", String(filters.supplierId));
      if (filters.stockStatus) params.set("stockStatus", filters.stockStatus);
      if (filters.minPrice != null) params.set("minPrice", String(filters.minPrice));
      if (filters.maxPrice != null) params.set("maxPrice", String(filters.maxPrice));
      if (filters.sort) params.set("sort", filters.sort);
      params.set("limit", String(limit));
      params.set("offset", String(pageParam));
      const url = `${api.pos.products.search.path}?${params.toString()}`;
      const res = await apiRequest(api.pos.products.search.method, url);
      return api.pos.products.search.responses[200].parse(await res.json());
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    refetchInterval: 5_000,
  });
}
