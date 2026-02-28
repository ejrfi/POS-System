import { brands, categories, discounts, products, saleItems, suppliers } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { db, poolConnection } from "../../db";
import { BusinessError } from "../../errors";

export type DeleteMode = "soft" | "hard";

export type ProductDeleteInfo = {
  id: number;
  name: string;
  barcode: string;
  status: string;
  stock: number;
  brandName: string | null;
  categoryName: string | null;
  supplierName: string | null;
  hasTransactions: boolean;
  hasActivePromo: boolean;
};

function coerceBool(v: any) {
  return Number(v) === 1 || v === true;
}

export class ProductDeletionService {
  private hasDiscountsActiveColumnPromise: Promise<boolean> | null = null;

  private async hasDiscountsActiveColumn(): Promise<boolean> {
    if (this.hasDiscountsActiveColumnPromise) return this.hasDiscountsActiveColumnPromise;
    this.hasDiscountsActiveColumnPromise = (async () => {
      try {
        const [rows] = await poolConnection.query(
          `
          SELECT 1 AS ok
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'discounts'
            AND COLUMN_NAME = 'active'
          LIMIT 1
          `
        );
        return Array.isArray(rows) && rows.length > 0;
      } catch {
        return false;
      }
    })();
    return this.hasDiscountsActiveColumnPromise;
  }

  async getDeleteInfo(productId: number): Promise<ProductDeleteInfo> {
    const hasActiveColumn = await this.hasDiscountsActiveColumn();
    const activeCondition = hasActiveColumn ? sql`${discounts.active} = TRUE` : sql`TRUE`;

    const hasTransactionsExpr = sql<number>`
      EXISTS(SELECT 1 FROM ${saleItems} si WHERE si.product_id = ${products.id} LIMIT 1)
    `;

    const hasActivePromoExpr = sql<number>`
      EXISTS(
        SELECT 1
        FROM ${discounts}
        WHERE ${activeCondition}
          AND ${discounts.status} = 'ACTIVE'
          AND (${discounts.startDate} IS NULL OR ${discounts.startDate} <= NOW())
          AND (${discounts.endDate} IS NULL OR ${discounts.endDate} >= NOW())
          AND (
            ${discounts.productId} = ${products.id}
            OR (${discounts.brandId} = ${products.brandId} AND ${products.brandId} IS NOT NULL)
            OR (${discounts.categoryId} = ${products.categoryId} AND ${products.categoryId} IS NOT NULL)
          )
        LIMIT 1
      )
    `;

    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        barcode: products.barcode,
        status: products.status,
        stock: products.stock,
        brandName: brands.name,
        categoryName: categories.name,
        supplierName: suppliers.name,
        hasTransactions: hasTransactionsExpr,
        hasActivePromo: hasActivePromoExpr,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .where(eq(products.id, productId));

    const row: any = rows[0];
    if (!row) throw new BusinessError(404, "NOT_FOUND", "Produk tidak ditemukan");

    return {
      id: Number(row.id),
      name: String(row.name),
      barcode: String(row.barcode),
      status: String(row.status ?? "ACTIVE"),
      stock: Number(row.stock ?? 0),
      brandName: row.brandName != null ? String(row.brandName) : null,
      categoryName: row.categoryName != null ? String(row.categoryName) : null,
      supplierName: row.supplierName != null ? String(row.supplierName) : null,
      hasTransactions: coerceBool(row.hasTransactions),
      hasActivePromo: coerceBool(row.hasActivePromo),
    };
  }

  async deleteProduct(params: { productId: number; mode: DeleteMode; actorRole: string }) {
    const mode = params.mode;
    if (mode === "hard" && params.actorRole !== "admin") {
      throw new BusinessError(403, "FORBIDDEN", "Tidak memiliki izin untuk hapus permanen");
    }

    return await db.transaction(async (tx) => {
      const hasActiveColumn = await this.hasDiscountsActiveColumn();
      const activeCondition = hasActiveColumn ? sql`${discounts.active} = TRUE` : sql`TRUE`;

      const [p] = await tx.select().from(products).where(eq(products.id, params.productId));
      if (!p) throw new BusinessError(404, "NOT_FOUND", "Produk tidak ditemukan");

      if (Number(p.stock) > 0) {
        throw new BusinessError(409, "PRODUCT_HAS_STOCK", "Tidak bisa menghapus produk: stok masih ada");
      }

      const [txAgg] = await tx
        .select({
          hasTransactions: sql<number>`EXISTS(SELECT 1 FROM ${saleItems} si WHERE si.product_id = ${params.productId} LIMIT 1)`,
        })
        .from(products)
        .where(eq(products.id, params.productId));
      const hasTransactions = coerceBool(txAgg?.hasTransactions);

      const [promoAgg] = await tx
        .select({
          hasActivePromo: sql<number>`
            EXISTS(
              SELECT 1
              FROM ${discounts}
              WHERE ${activeCondition}
                AND ${discounts.status} = 'ACTIVE'
                AND (${discounts.startDate} IS NULL OR ${discounts.startDate} <= NOW())
                AND (${discounts.endDate} IS NULL OR ${discounts.endDate} >= NOW())
                AND (
                  ${discounts.productId} = ${params.productId}
                  OR (${discounts.brandId} = ${p.brandId} AND ${p.brandId} IS NOT NULL)
                  OR (${discounts.categoryId} = ${p.categoryId} AND ${p.categoryId} IS NOT NULL)
                )
              LIMIT 1
            )
          `,
        })
        .from(products)
        .where(eq(products.id, params.productId));
      const hasActivePromo = coerceBool(promoAgg?.hasActivePromo);

      if (hasActivePromo) {
        throw new BusinessError(409, "PRODUCT_HAS_ACTIVE_PROMO", "Tidak bisa menghapus produk: masih ada promo aktif");
      }

      if (mode === "hard") {
        if (hasTransactions) {
          throw new BusinessError(409, "PRODUCT_HAS_TRANSACTIONS", "Produk pernah digunakan dalam transaksi, tidak bisa hapus permanen");
        }
        await tx.delete(products).where(eq(products.id, params.productId));
        return { mode: "hard" as const };
      }

      await tx.update(products).set({ status: "INACTIVE", deletedAt: sql`NOW()` as any }).where(eq(products.id, params.productId));

      return { mode: "soft" as const, hasTransactions };
    });
  }
}
