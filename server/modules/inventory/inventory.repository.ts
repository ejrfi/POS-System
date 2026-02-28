import { brands, categories, products } from "@shared/schema";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "../../db";

export type InventoryStatus = "ACTIVE" | "INACTIVE";

export class InventoryRepository {
  async listCategories(params?: { includeInactive?: boolean }) {
    const where = params?.includeInactive ? undefined : eq(categories.status, "ACTIVE");
    return await db.select().from(categories).where(where as any).orderBy(categories.name);
  }

  async getCategoryById(id: number) {
    const [row] = await db.select().from(categories).where(eq(categories.id, id));
    return row;
  }

  async getCategoryByName(name: string) {
    const [row] = await db.select().from(categories).where(eq(categories.name, name));
    return row;
  }

  async createCategory(data: { name: string; description?: string | null; status?: InventoryStatus }) {
    const [result] = await db.insert(categories).values({
      name: data.name,
      description: data.description ?? null,
      status: data.status ?? "ACTIVE",
    });
    const [row] = await db.select().from(categories).where(eq(categories.id, result.insertId));
    return row!;
  }

  async updateCategory(id: number, data: { name?: string; description?: string | null; status?: InventoryStatus }) {
    await db.update(categories).set({
      ...(data.name != null ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.status != null ? { status: data.status } : {}),
    }).where(eq(categories.id, id));
    const [row] = await db.select().from(categories).where(eq(categories.id, id));
    return row;
  }

  async countActiveBrandsByCategory(categoryId: number) {
    const [row] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(brands)
      .where(and(eq(brands.categoryId, categoryId), eq(brands.status, "ACTIVE")));
    return Number(row?.count ?? 0);
  }

  async listBrands(params?: { categoryId?: number; includeInactive?: boolean }) {
    const conditions = [];
    if (params?.categoryId != null) conditions.push(eq(brands.categoryId, params.categoryId));
    if (!params?.includeInactive) conditions.push(eq(brands.status, "ACTIVE"));
    const where = conditions.length ? and(...conditions) : undefined;
    return await db.select().from(brands).where(where as any).orderBy(brands.name);
  }

  async getBrandById(id: number) {
    const [row] = await db.select().from(brands).where(eq(brands.id, id));
    return row;
  }

  async findBrandByNameInCategory(params: { name: string; categoryId: number; excludeId?: number }) {
    const conditions = [eq(brands.categoryId, params.categoryId), eq(brands.name, params.name)];
    if (params.excludeId != null) conditions.push(ne(brands.id, params.excludeId));
    const [row] = await db.select().from(brands).where(and(...conditions));
    return row;
  }

  async createBrand(data: { name: string; categoryId: number; status?: InventoryStatus }) {
    const [result] = await db.insert(brands).values({
      name: data.name,
      categoryId: data.categoryId,
      status: data.status ?? "ACTIVE",
    });
    const [row] = await db.select().from(brands).where(eq(brands.id, result.insertId));
    return row!;
  }

  async updateBrand(id: number, data: { name?: string; categoryId?: number; status?: InventoryStatus }) {
    await db.update(brands).set({
      ...(data.name != null ? { name: data.name } : {}),
      ...(data.categoryId != null ? { categoryId: data.categoryId } : {}),
      ...(data.status != null ? { status: data.status } : {}),
    }).where(eq(brands.id, id));
    const [row] = await db.select().from(brands).where(eq(brands.id, id));
    return row;
  }

  async countProductsByBrand(brandId: number) {
    const [row] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(products)
      .where(eq(products.brandId, brandId));
    return Number(row?.count ?? 0);
  }
}

