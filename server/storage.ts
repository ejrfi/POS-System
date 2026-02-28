
import { 
  users, products, brands, categories, suppliers, customers, sales, cashierShifts, suspendedSales, saleItems, pointLogs, returns, returnItems, discounts, productPriceAudits, loyaltySettings, auditLogs, appSettings
} from "@shared/schema";
import type { 
  User, InsertUser, Product, Brand, Category, Supplier, Customer, 
  Sale, SaleItem, CheckoutRequest, Return, ReturnItem, AuditLog,
  Discount,
  CashierShift
} from "@shared/schema";
import { db } from "./db";
import { BusinessError } from "./errors";
import { eq, desc, asc, sql, and, inArray, gte } from "drizzle-orm";

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function generateReturnNumber() {
  return `RET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export type CashierShiftSummary = {
  totalTransactions: number;
  totalSales: number;
  cashSales: number;
  nonCashSales: number;
  totalRefunds: number;
  cashRefunds: number;
  nonCashRefunds: number;
  expectedCash: number;
  paymentBreakdown: Record<string, number>;
  totalDiscount: number;
  totalPointUsed: number;
  totalPointEarned: number;
  totalVoid: number;
  totalReturns: number;
  pointTxCount: number;
  bigDiscountTxCount: number;
  pointsReversed: number;
  pointsRestored: number;
};

export type SafeUser = Pick<User, "id" | "username" | "fullName" | "role" | "createdAt">;

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(params?: { search?: string }): Promise<SafeUser[]>;
  updateUser(id: number, input: { username?: string; fullName?: string; role?: string; password?: string }): Promise<SafeUser | undefined>;
  deleteUser(id: number): Promise<void>;

  // Products
  getProducts(search?: string, brandId?: number, status?: "ACTIVE" | "INACTIVE" | "ARCHIVED"): Promise<(Product & { brand: Brand | null })[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductByBarcode(barcode: string): Promise<Product | undefined>;
  createProduct(product: Partial<Product>): Promise<Product>;
  updateProduct(id: number, product: Partial<Product>, changedBy?: number): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<void>;
  getPosFilters(): Promise<{ brands: Brand[]; categories: Category[]; suppliers: Supplier[]; priceMin: number; priceMax: number; lowStockThreshold: number }>;
  searchPosProducts(params?: {
    q?: string;
    brandId?: number;
    categoryId?: number;
    supplierId?: number;
    stockStatus?: "all" | "in" | "low" | "out";
    minPrice?: number;
    maxPrice?: number;
    sort?: "relevance" | "nameAsc" | "priceAsc" | "priceDesc" | "stockDesc" | "bestSelling30d";
    limit?: number;
    offset?: number;
  }): Promise<{ items: (Product & { brand: Brand | null; category: Category | null; supplier: Supplier | null })[]; total: number; nextOffset: number | null }>;

  // Brands
  getBrands(): Promise<Brand[]>;
  createBrand(brand: Partial<Brand>): Promise<Brand>;
  deleteBrand(id: number): Promise<void>;

  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: Partial<Category>): Promise<Category>;

  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  createSupplier(supplier: Partial<Supplier>): Promise<Supplier>;

  // Customers
  getCustomers(params?: {
    search?: string;
    status?: "ACTIVE" | "INACTIVE";
    tierLevel?: "REGULAR" | "SILVER" | "GOLD" | "PLATINUM";
    customerType?: "regular" | "member" | "vip";
    page?: number;
    pageSize?: number;
    sortBy?: "createdAt" | "name" | "phone" | "totalPoints" | "totalSpending" | "tierLevel";
    sortDir?: "asc" | "desc";
  }): Promise<{ items: Customer[]; page: number; pageSize: number; total: number }>;
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerTransactions(customerId: number, params?: { page?: number; pageSize?: number }): Promise<{ items: Sale[]; page: number; pageSize: number; total: number } | undefined>;
  getCustomerPointHistory(customerId: number, params?: { page?: number; pageSize?: number }): Promise<{ items: { id: number; customerId: number; transactionId: number | null; pointEarned: number; pointUsed: number; description: string; createdAt: Date | null }[]; page: number; pageSize: number; total: number } | undefined>;
  createCustomer(customer: Partial<Customer>): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<void>;
  updateCustomerPoints(id: number, points: number): Promise<Customer>;

  // Sales (Transactional)
  createSale(data: CheckoutRequest, cashierId: number): Promise<Sale & { items: SaleItem[] }>;
  getSales(params?: {
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
  }, context?: { userId: number; role: string }): Promise<{ items: any[]; total: number; page: number; pageSize: number }>;
  getSale(id: number): Promise<(Sale & {
    items: (SaleItem & { product: Product })[];
    cashier: User | null;
    customer: Customer | null;
    returns: any[];
    auditLogs: AuditLog[];
  }) | undefined>;
  deleteSale(id: number, cancelledBy?: number, cancelledShiftId?: number): Promise<void>;

  // Cashier Shifts
  getActiveCashierShift(userId: number): Promise<CashierShift | undefined>;
  openCashierShift(userId: number, openingCash: number, note?: string, terminalName?: string, ipAddress?: string, userAgent?: string, clientOpenedAt?: Date): Promise<CashierShift>;
  closeCashierShift(userId: number, actualCash: number, closeNote?: string): Promise<{ shift: CashierShift; summary: CashierShiftSummary }>;
  approveCashierShift(shiftId: number, approvedBy: number, approvalNote?: string): Promise<CashierShift>;
  listCashierShifts(filters?: { startDate?: Date; endDate?: Date; cashierName?: string; role?: string; status?: "OPEN" | "CLOSED" | "ACTIVE"; approvalStatus?: "NONE" | "PENDING" | "APPROVED" | "REJECTED"; diffLargeOnly?: boolean; search?: string }): Promise<(CashierShift & { user: SafeUser | null })[]>;
  getCashierShiftSummary(id: number): Promise<{ shift: CashierShift & { user: SafeUser | null }; summary: CashierShiftSummary } | undefined>;
  getCashierShiftTransactions(id: number): Promise<{ id: number; invoiceNo: string; transactionDate: Date | null; paymentMethod: string; finalAmount: string; status: "COMPLETED" | "CANCELLED" | "RETURN" | "REFUNDED" | "PARTIAL_REFUND" }[] | undefined>;

  createSuspendedSale(cashierId: number, data: CheckoutRequest, note?: string): Promise<{ id: number; note: string | null; createdAt: Date | null; itemCount: number }>;
  getSuspendedSales(cashierId: number): Promise<{ id: number; note: string | null; createdAt: Date | null; itemCount: number }[]>;
  recallSuspendedSale(cashierId: number, id: number): Promise<{ id: number; note: string | null; createdAt: Date | null; customer: Customer | null; globalDiscount: number; paymentMethod: string; items: (Product & { quantity: number; discount: number })[] } | undefined>;
  
  // Returns
  createReturn(
    saleId: number,
    items: { productId: number; quantity: number }[],
    reason: string,
    refundMethod: string,
    actor: { id: number; role: string },
    shiftId: number
  ): Promise<Return>;
  getReturns(
    params?: { startDate?: string; endDate?: string; status?: string; search?: string; page?: number; pageSize?: number },
    context?: { userId: number; role: string }
  ): Promise<{ items: any[]; total: number; page: number; pageSize: number }>;
  deleteReturn(id: number, cancelledBy?: number): Promise<void>;

  // Dashboard
  getDashboardOverview(params?: { days?: number; months?: number; topLimit?: number; lowStockThreshold?: number }): Promise<{
    summary: {
      todaySales: number;
      todayTransactions: number;
      monthSales: number;
      todayItemsSold: number;
      lowStockCount: number;
      activeExpectedCash: number;
      activeShiftCount: number;
      pendingCount: number;
    };
    charts: {
      dailySales: { date: string; totalSales: number; cashSales: number; nonCashSales: number; transactions: number }[];
      monthlySales: { month: string; totalSales: number; transactions: number }[];
      paymentBreakdown: { method: string; totalSales: number; transactions: number }[];
      topProducts: { productId: number; productName: string; quantitySold: number; totalRevenue: number }[];
    };
    operational: {
      activeShifts: { id: number; userId: number; userName: string; userRole: string; terminalName: string | null; openedAt: Date | null; openingCash: number; totalTransactions: number; totalSales: number; cashSales: number; cashRefunds: number; expectedCash: number }[];
      lowStockProducts: { id: number; name: string; stock: number }[];
      cashDiscrepancies: { shiftId: number; userName: string; terminalName: string | null; closedAt: Date | null; cashDifference: number }[];
    };
  }>;

  // Reports
  getDailyStats(): Promise<{ totalTransactions: number; totalItems: number; totalRevenue: number }>;
  getItemSales(startDate?: Date, endDate?: Date, brandId?: number): Promise<{ productName: string, brandName: string | null, quantitySold: number, totalRevenue: number }[]>;

  // Discounts
  getDiscounts(params?: {
    active?: boolean;
    search?: string;
    status?: "ACTIVE" | "INACTIVE";
    appliesTo?: "product" | "category" | "global" | "customer";
    page?: number;
    pageSize?: number;
    sortBy?: "createdAt" | "name" | "priorityLevel" | "startDate" | "endDate";
    sortDir?: "asc" | "desc";
  }): Promise<{ items: Discount[]; page: number; pageSize: number; total: number }>;
  getActiveDiscounts(): Promise<Discount[]>;
  getDiscount(id: number): Promise<Discount | undefined>;
  createDiscount(discount: Partial<Discount>): Promise<Discount>;
  updateDiscount(id: number, discount: Partial<Discount>): Promise<Discount | undefined>;
  deleteDiscount(id: number): Promise<void>;

  // Loyalty Settings
  getLoyaltySettings(): Promise<{
    earnAmountPerPoint: number;
    redeemAmountPerPoint: number;
    silverMinSpending: number;
    goldMinSpending: number;
    platinumMinSpending: number;
    silverPointMultiplier: number;
    goldPointMultiplier: number;
    platinumPointMultiplier: number;
  }>;
  updateLoyaltySettings(input: {
    earnAmountPerPoint: number;
    redeemAmountPerPoint: number;
    silverMinSpending: number;
    goldMinSpending: number;
    platinumMinSpending: number;
    silverPointMultiplier: number;
    goldPointMultiplier: number;
    platinumPointMultiplier: number;
  }): Promise<{
    earnAmountPerPoint: number;
    redeemAmountPerPoint: number;
    silverMinSpending: number;
    goldMinSpending: number;
    platinumMinSpending: number;
    silverPointMultiplier: number;
    goldPointMultiplier: number;
    platinumPointMultiplier: number;
  }>;

  // App Settings
  getAppSettings(): Promise<{ storeName: string; storeAddress: string | null; receiptFooter: string | null }>;
  updateAppSettings(input: {
    storeName: string;
    storeAddress?: string | null;
    receiptFooter?: string | null;
  }): Promise<{ storeName: string; storeAddress: string | null; receiptFooter: string | null }>;
}

export class DatabaseStorage implements IStorage {
  private async computeCashierShiftSummaryTx(tx: any, shiftId: number, openingCash: number): Promise<CashierShiftSummary> {
    const bigDiscountThreshold = Number(process.env.SHIFT_BIG_DISCOUNT_THRESHOLD ?? 100000);

    const [agg] = await tx
      .select({
        totalTransactions: sql<number>`COUNT(*)`,
        totalSales: sql<string>`COALESCE(SUM(${sales.finalAmount}), 0)`,
        cashSales: sql<string>`COALESCE(SUM(CASE WHEN ${sales.paymentMethod} = 'cash' THEN ${sales.finalAmount} ELSE 0 END), 0)`,
        totalDiscount: sql<string>`COALESCE(SUM(${sales.discountAmount}), 0)`,
        totalPointUsed: sql<string>`COALESCE(SUM(${sales.redeemedPoints}), 0)`,
        totalPointEarned: sql<string>`COALESCE(SUM(${sales.pointsEarned}), 0)`,
        pointTxCount: sql<string>`COALESCE(SUM(CASE WHEN ${sales.redeemedPoints} > 0 THEN 1 ELSE 0 END), 0)`,
        bigDiscountTxCount: sql<string>`COALESCE(SUM(CASE WHEN ${sales.discountAmount} >= ${bigDiscountThreshold} THEN 1 ELSE 0 END), 0)`,
      })
      .from(sales)
      .where(and(eq(sales.shiftId, shiftId), sql`${sales.status} <> 'CANCELLED'`));

    const totalSales = Number(agg?.totalSales ?? 0);
    const cashSales = Number(agg?.cashSales ?? 0);
    const nonCashSales = totalSales - cashSales;
    const totalDiscount = Number(agg?.totalDiscount ?? 0);
    const totalPointUsed = Number(agg?.totalPointUsed ?? 0);
    const totalPointEarned = Number(agg?.totalPointEarned ?? 0);
    const pointTxCount = Number(agg?.pointTxCount ?? 0);
    const bigDiscountTxCount = Number(agg?.bigDiscountTxCount ?? 0);

    const [voidAgg] = await tx
      .select({
        totalVoid: sql<string>`COALESCE(COUNT(*), 0)`,
        cashVoids: sql<string>`COALESCE(SUM(CASE WHEN ${sales.paymentMethod} = 'cash' THEN ${sales.finalAmount} ELSE 0 END), 0)`,
      })
      .from(sales)
      .where(and(eq(sales.cancelledShiftId, shiftId), eq(sales.status, "CANCELLED")));
    const totalVoid = Number(voidAgg?.totalVoid ?? 0);
    const cashVoids = Number(voidAgg?.cashVoids ?? 0);

    const [refundAgg] = await tx
      .select({
        totalRefunds: sql<string>`COALESCE(SUM(${returns.totalRefund}), 0)`,
        cashRefunds: sql<string>`COALESCE(SUM(CASE WHEN ${returns.refundMethod} = 'cash' THEN ${returns.totalRefund} ELSE 0 END), 0)`,
        totalReturns: sql<string>`COALESCE(COUNT(*), 0)`,
        pointsReversed: sql<string>`COALESCE(SUM(${returns.pointsReversed}), 0)`,
        pointsRestored: sql<string>`COALESCE(SUM(${returns.pointsRestored}), 0)`,
      })
      .from(returns)
      .where(and(eq(returns.shiftId, shiftId), eq(returns.status, "COMPLETED")));

    const totalRefunds = Number(refundAgg?.totalRefunds ?? 0);
    const cashRefunds = Number(refundAgg?.cashRefunds ?? 0);
    const nonCashRefunds = totalRefunds - cashRefunds;
    const totalReturns = Number(refundAgg?.totalReturns ?? 0);
    const pointsReversed = Number(refundAgg?.pointsReversed ?? 0);
    const pointsRestored = Number(refundAgg?.pointsRestored ?? 0);

    const expectedCash = openingCash + cashSales - cashRefunds - cashVoids;

    const byMethod = await tx
      .select({
        method: sales.paymentMethod,
        total: sql<string>`COALESCE(SUM(${sales.finalAmount}), 0)`,
      })
      .from(sales)
      .where(and(eq(sales.shiftId, shiftId), sql`${sales.status} <> 'CANCELLED'`))
      .groupBy(sales.paymentMethod);

    const paymentBreakdown: Record<string, number> = {};
    for (const row of byMethod) {
      paymentBreakdown[String(row.method ?? "unknown")] = Number(row.total ?? 0);
    }

    return {
      totalTransactions: Number(agg?.totalTransactions ?? 0),
      totalSales,
      cashSales,
      nonCashSales,
      totalRefunds,
      cashRefunds,
      nonCashRefunds,
      expectedCash,
      paymentBreakdown,
      totalDiscount,
      totalPointUsed,
      totalPointEarned,
      totalVoid,
      totalReturns,
      pointTxCount,
      bigDiscountTxCount,
      pointsReversed,
      pointsRestored,
    };
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [result] = await db.insert(users).values(insertUser);
    const id = result.insertId;
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUsers(params?: { search?: string }): Promise<SafeUser[]> {
    const search = params?.search?.trim() ? params.search.trim().slice(0, 80) : undefined;
    let query = db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users) as any;

    if (search) {
      query = query.where(sql`(${users.username} LIKE ${`%${search}%`} OR ${users.fullName} LIKE ${`%${search}%`})`);
    }

    return await query.orderBy(desc(users.createdAt));
  }

  async updateUser(id: number, input: { username?: string; fullName?: string; role?: string; password?: string }): Promise<SafeUser | undefined> {
    const updates: any = {};
    if (input.username != null) updates.username = input.username;
    if (input.fullName != null) updates.fullName = input.fullName;
    if (input.role != null) updates.role = input.role;
    if (input.password != null) updates.password = input.password;
    if (Object.keys(updates).length === 0) {
      const [u] = await db.select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        createdAt: users.createdAt,
      }).from(users).where(eq(users.id, id));
      return u;
    }

    await db.update(users).set(updates).where(eq(users.id, id));
    const [updated] = await db.select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, id));
    return updated;
  }

  async deleteUser(id: number): Promise<void> {
    const [hasSale] = await db.select({ ok: sql<number>`1` }).from(sales).where(eq(sales.cashierId, id)).limit(1);
    if (hasSale) throw new BusinessError(409, "USER_HAS_TRANSACTIONS", "User sudah memiliki transaksi");

    const [hasShift] = await db.select({ ok: sql<number>`1` }).from(cashierShifts).where(eq(cashierShifts.userId, id)).limit(1);
    if (hasShift) throw new BusinessError(409, "USER_HAS_SHIFTS", "User sudah memiliki riwayat shift");

    await db.delete(users).where(eq(users.id, id));
  }

  async getProducts(search?: string, brandId?: number, status?: "ACTIVE" | "INACTIVE" | "ARCHIVED") {
    const hasTransactionsExpr = sql<number>`
      EXISTS(SELECT 1 FROM ${saleItems} si WHERE si.product_id = ${products.id} LIMIT 1)
    `;
    const hasActivePromoExpr = sql<number>`
      EXISTS(
        SELECT 1
        FROM ${discounts}
        WHERE ${discounts.active} = TRUE
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

    let query = db
      .select({ product: products, brand: brands, hasTransactions: hasTransactionsExpr, hasActivePromo: hasActivePromoExpr })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id));

    const filters = [];
    if (search) {
      filters.push(sql`(${products.name} LIKE ${`%${search}%`} OR ${products.barcode} LIKE ${`%${search}%`})`);
    }
    if (brandId) filters.push(eq(products.brandId, brandId));
    if (status) filters.push(eq(products.status, status));

    if (filters.length > 0) {
      query = query.where(and(...filters)) as any;
    }

    const rows = await (query.orderBy(desc(products.createdAt)) as any);
    return rows.map((r: any) => ({
      ...r.product,
      brand: r.brand,
      hasTransactions: Number(r.hasTransactions) === 1,
      hasActivePromo: Number(r.hasActivePromo) === 1,
    }));
  }

  async getPosFilters() {
    const [priceAgg] = await db
      .select({
        priceMin: sql<string>`COALESCE(MIN(${products.price}), 0)`,
        priceMax: sql<string>`COALESCE(MAX(${products.price}), 0)`,
      })
      .from(products)
      .where(eq(products.status, "ACTIVE"));

    const brandsList = await db.select().from(brands).where(eq(brands.status, "ACTIVE")).orderBy(brands.name);
    const categoriesList = await db.select().from(categories).where(eq(categories.status, "ACTIVE")).orderBy(categories.name);
    const suppliersList = await db.select().from(suppliers).where(eq(suppliers.status, "ACTIVE")).orderBy(suppliers.name);
    return {
      brands: brandsList,
      categories: categoriesList,
      suppliers: suppliersList,
      priceMin: Number(priceAgg?.priceMin ?? 0),
      priceMax: Number(priceAgg?.priceMax ?? 0),
      lowStockThreshold: 10,
    };
  }

  async searchPosProducts(params?: {
    q?: string;
    brandId?: number;
    categoryId?: number;
    supplierId?: number;
    stockStatus?: "all" | "in" | "low" | "out";
    minPrice?: number;
    maxPrice?: number;
    sort?: "relevance" | "nameAsc" | "priceAsc" | "priceDesc" | "stockDesc" | "bestSelling30d";
    limit?: number;
    offset?: number;
  }) {
    const q = params?.q?.trim() ? params.q.trim().slice(0, 80) : undefined;
    const brandId = params?.brandId ? Number(params.brandId) : undefined;
    const categoryId = params?.categoryId ? Number(params.categoryId) : undefined;
    const supplierId = params?.supplierId ? Number(params.supplierId) : undefined;
    const stockStatus = params?.stockStatus ?? "all";
    const sort = params?.sort ?? "relevance";
    const limit = Math.min(200, Math.max(1, Number(params?.limit ?? 48)));
    const offset = Math.max(0, Number(params?.offset ?? 0));
    const lowStockThreshold = 10;

    const minPrice = params?.minPrice != null && Number.isFinite(Number(params.minPrice)) ? Number(params.minPrice) : undefined;
    const maxPrice = params?.maxPrice != null && Number.isFinite(Number(params.maxPrice)) ? Number(params.maxPrice) : undefined;

    const discountAmountExpr = sql<string>`
      COALESCE((
        SELECT MAX(
          LEAST(
            CASE
              WHEN ${discounts.type} = 'percentage' THEN ${products.price} * (${discounts.value} / 100)
              ELSE ${discounts.value}
            END,
            ${products.price}
          )
        )
        FROM ${discounts}
        WHERE ${discounts.active} = true
          AND ${discounts.status} = 'ACTIVE'
          AND (${discounts.startDate} IS NULL OR ${discounts.startDate} <= NOW())
          AND (${discounts.endDate} IS NULL OR ${discounts.endDate} >= NOW())
          AND ${discounts.customerType} IS NULL
          AND ${discounts.minimumPurchase} = 0
          AND (
            ${discounts.productId} = ${products.id}
            OR (${discounts.brandId} = ${products.brandId} AND ${products.brandId} IS NOT NULL)
            OR (${discounts.categoryId} = ${products.categoryId} AND ${products.categoryId} IS NOT NULL)
          )
      ), 0)
    `;
    const discountedPriceExpr = sql<string>`GREATEST(${products.price} - (${discountAmountExpr}), 0)`;

    const productFilters: any[] = [];
    productFilters.push(eq(products.status, "ACTIVE"));
    if (q) {
      productFilters.push(sql`(${products.name} LIKE ${`%${q}%`} OR ${products.barcode} LIKE ${`%${q}%`})`);
    }
    if (brandId) {
      productFilters.push(eq(products.brandId, brandId));
    }
    if (categoryId) {
      productFilters.push(eq(products.categoryId, categoryId));
    }
    if (supplierId) {
      productFilters.push(eq(products.supplierId, supplierId));
    }
    if (stockStatus === "in") {
      productFilters.push(sql`${products.stock} > 0`);
    } else if (stockStatus === "out") {
      productFilters.push(eq(products.stock, 0));
    } else if (stockStatus === "low") {
      productFilters.push(and(sql`${products.stock} > 0`, sql`${products.stock} <= ${lowStockThreshold}`));
    }
    if (minPrice != null) {
      productFilters.push(sql`${products.price} >= ${minPrice}`);
    }
    if (maxPrice != null) {
      productFilters.push(sql`${products.price} <= ${maxPrice}`);
    }

    if (sort === "bestSelling30d") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 29);

      const qtyExpr = sql<number>`SUM(CASE WHEN ${saleItems.conversionQty} > 0 THEN ${saleItems.conversionQty} ELSE ${saleItems.quantity} END)`;

      let topQuery = db
        .select({
          productId: saleItems.productId,
          qty: qtyExpr,
        })
        .from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .innerJoin(products, eq(saleItems.productId, products.id))
        .where(and(eq(sales.status, "COMPLETED"), sql`${sales.transactionDate} >= ${start}`))
        .groupBy(saleItems.productId)
        .orderBy(desc(qtyExpr))
        .limit(limit)
        .offset(offset);

      if (productFilters.length) {
        // @ts-ignore
        topQuery = topQuery.where(and(eq(sales.status, "COMPLETED"), sql`${sales.transactionDate} >= ${start}`, and(...productFilters)));
      }

      // @ts-ignore
      const topRows = await topQuery;
      const ids = topRows.map(r => Number(r.productId));

      const [totalAgg] = await db
        .select({ total: sql<number>`COUNT(DISTINCT ${saleItems.productId})` })
        .from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .innerJoin(products, eq(saleItems.productId, products.id))
        .where(
          productFilters.length
            ? and(eq(sales.status, "COMPLETED"), sql`${sales.transactionDate} >= ${start}`, and(...productFilters))
            : and(eq(sales.status, "COMPLETED"), sql`${sales.transactionDate} >= ${start}`),
        );

      if (!ids.length) {
        return { items: [], total: Number(totalAgg?.total ?? 0), nextOffset: null };
      }

      const rows = await db
        .select({
          id: products.id,
          barcode: products.barcode,
          name: products.name,
          description: products.description,
          brandId: products.brandId,
          categoryId: products.categoryId,
          supplierId: products.supplierId,
          price: products.price,
          discountAmount: discountAmountExpr,
          discountedPrice: discountedPriceExpr,
          pcsPerCarton: products.pcsPerCarton,
          cartonPrice: products.cartonPrice,
          supportsCarton: products.supportsCarton,
          stock: products.stock,
          stockPcs: products.stock,
          stockCartons: sql<number>`FLOOR(${products.stock} / ${products.pcsPerCarton})`,
          stockRemainderPcs: sql<number>`MOD(${products.stock}, ${products.pcsPerCarton})`,
          minStock: products.minStock,
          image: products.image,
          createdAt: products.createdAt,
          brand: brands,
          category: categories,
          supplier: suppliers,
        })
        .from(products)
        .innerJoin(brands, and(eq(products.brandId, brands.id), eq(brands.status, "ACTIVE")))
        .innerJoin(categories, and(eq(products.categoryId, categories.id), eq(categories.status, "ACTIVE")))
        .innerJoin(suppliers, and(eq(products.supplierId, suppliers.id), eq(suppliers.status, "ACTIVE")))
        .where(inArray(products.id, ids));

      const byId = new Map<number, any>();
      rows.forEach(r => byId.set(Number(r.id), r));
      const items = ids.map(id => byId.get(id)).filter(Boolean);
      const nextOffset = offset + limit < Number(totalAgg?.total ?? 0) ? offset + limit : null;
      return { items, total: Number(totalAgg?.total ?? 0), nextOffset };
    }

    let query = db
      .select({
        id: products.id,
        barcode: products.barcode,
        name: products.name,
        description: products.description,
        brandId: products.brandId,
        categoryId: products.categoryId,
        supplierId: products.supplierId,
        price: products.price,
        discountAmount: discountAmountExpr,
        discountedPrice: discountedPriceExpr,
        pcsPerCarton: products.pcsPerCarton,
        cartonPrice: products.cartonPrice,
        supportsCarton: products.supportsCarton,
        stock: products.stock,
        stockPcs: products.stock,
        stockCartons: sql<number>`FLOOR(${products.stock} / ${products.pcsPerCarton})`,
        stockRemainderPcs: sql<number>`MOD(${products.stock}, ${products.pcsPerCarton})`,
        minStock: products.minStock,
        image: products.image,
        createdAt: products.createdAt,
        brand: brands,
        category: categories,
        supplier: suppliers,
      })
      .from(products)
      .innerJoin(brands, and(eq(products.brandId, brands.id), eq(brands.status, "ACTIVE")))
      .innerJoin(categories, and(eq(products.categoryId, categories.id), eq(categories.status, "ACTIVE")))
      .innerJoin(suppliers, and(eq(products.supplierId, suppliers.id), eq(suppliers.status, "ACTIVE")));

    if (productFilters.length) {
      // @ts-ignore
      query = query.where(and(...productFilters));
    }

    if (sort === "nameAsc") {
      // @ts-ignore
      query = query.orderBy(asc(products.name));
    } else if (sort === "priceAsc") {
      // @ts-ignore
      query = query.orderBy(asc(products.price));
    } else if (sort === "priceDesc") {
      // @ts-ignore
      query = query.orderBy(desc(products.price));
    } else if (sort === "stockDesc") {
      // @ts-ignore
      query = query.orderBy(desc(products.stock));
    } else {
      if (q) {
        // @ts-ignore
        query = query.orderBy(
          desc(sql`CASE WHEN ${products.barcode} = ${q} THEN 1 ELSE 0 END`),
          desc(products.createdAt),
        );
      } else {
        // @ts-ignore
        query = query.orderBy(desc(products.createdAt));
      }
    }

    // @ts-ignore
    const items = await query.limit(limit).offset(offset);

    let totalQuery = db
      .select({ total: sql<number>`COUNT(*)` })
      .from(products)
      .innerJoin(brands, and(eq(products.brandId, brands.id), eq(brands.status, "ACTIVE")))
      .innerJoin(categories, and(eq(products.categoryId, categories.id), eq(categories.status, "ACTIVE")))
      .innerJoin(suppliers, and(eq(products.supplierId, suppliers.id), eq(suppliers.status, "ACTIVE")));

    if (productFilters.length) {
      // @ts-ignore
      totalQuery = totalQuery.where(and(...productFilters));
    }

    // @ts-ignore
    const [totalAgg] = await totalQuery;
    const total = Number(totalAgg?.total ?? 0);
    const nextOffset = offset + limit < total ? offset + limit : null;
    return { items, total, nextOffset };
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductByBarcode(barcode: string): Promise<Product | undefined> {
    const discountAmountExpr = sql<string>`
      COALESCE((
        SELECT MAX(
          LEAST(
            CASE
              WHEN ${discounts.type} = 'percentage' THEN ${products.price} * (${discounts.value} / 100)
              ELSE ${discounts.value}
            END,
            ${products.price}
          )
        )
        FROM ${discounts}
        WHERE ${discounts.active} = true
          AND ${discounts.status} = 'ACTIVE'
          AND (${discounts.startDate} IS NULL OR ${discounts.startDate} <= NOW())
          AND (${discounts.endDate} IS NULL OR ${discounts.endDate} >= NOW())
          AND ${discounts.customerType} IS NULL
          AND ${discounts.minimumPurchase} = 0
          AND (
            ${discounts.productId} = ${products.id}
            OR (${discounts.brandId} = ${products.brandId} AND ${products.brandId} IS NOT NULL)
            OR (${discounts.categoryId} = ${products.categoryId} AND ${products.categoryId} IS NOT NULL)
          )
      ), 0)
    `;

    const discountedPriceExpr = sql<string>`GREATEST(${products.price} - (${discountAmountExpr}), 0)`;

    const [product] = await db
      .select({
        id: products.id,
        barcode: products.barcode,
        name: products.name,
        description: products.description,
        brandId: products.brandId,
        categoryId: products.categoryId,
        supplierId: products.supplierId,
        price: products.price,
        discountAmount: discountAmountExpr,
        discountedPrice: discountedPriceExpr,
        pcsPerCarton: products.pcsPerCarton,
        cartonPrice: products.cartonPrice,
        supportsCarton: products.supportsCarton,
        stock: products.stock,
        minStock: products.minStock,
        image: products.image,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(eq(products.barcode, barcode));

    return product as any;
  }

  async createProduct(product: Partial<Product>): Promise<Product> {
    const [result] = await db.insert(products).values(product as any);
    const id = result.insertId;
    const [newProduct] = await db.select().from(products).where(eq(products.id, id));
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<Product>, changedBy?: number): Promise<Product | undefined> {
    return await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(products).where(eq(products.id, id));
      if (!existing) return undefined;

      await tx.update(products).set(product).where(eq(products.id, id));
      const [updated] = await tx.select().from(products).where(eq(products.id, id));
      if (!updated) return undefined;

      const oldCartonPrice = existing.cartonPrice == null ? null : String(existing.cartonPrice);
      const newCartonPrice =
        product.cartonPrice === undefined ? oldCartonPrice : product.cartonPrice == null ? null : String(product.cartonPrice);

      if (newCartonPrice !== oldCartonPrice) {
        await tx.insert(productPriceAudits).values({
          productId: id,
          changedBy: changedBy ?? null,
          field: "carton_price",
          oldValue: oldCartonPrice,
          newValue: newCartonPrice,
        } as any);
      }

      const oldPcsPerCarton = Number(existing.pcsPerCarton ?? 1);
      const newPcsPerCarton = product.pcsPerCarton === undefined ? oldPcsPerCarton : Number(product.pcsPerCarton);
      if (Number.isFinite(newPcsPerCarton) && newPcsPerCarton !== oldPcsPerCarton) {
        await tx.insert(productPriceAudits).values({
          productId: id,
          changedBy: changedBy ?? null,
          field: "pcs_per_carton",
          oldValue: String(oldPcsPerCarton),
          newValue: String(newPcsPerCarton),
        } as any);
      }

      const oldSupportsCarton = Boolean(existing.supportsCarton);
      const newSupportsCarton =
        product.supportsCarton === undefined ? oldSupportsCarton : Boolean(product.supportsCarton);
      if (newSupportsCarton !== oldSupportsCarton) {
        await tx.insert(productPriceAudits).values({
          productId: id,
          changedBy: changedBy ?? null,
          field: "supports_carton",
          oldValue: oldSupportsCarton ? "1" : "0",
          newValue: newSupportsCarton ? "1" : "0",
        } as any);
      }

      return updated;
    });
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async getBrands(): Promise<Brand[]> {
    return await db.select().from(brands);
  }

  async createBrand(brand: Partial<Brand>): Promise<Brand> {
    const [result] = await db.insert(brands).values(brand as any);
    const id = result.insertId;
    const [newBrand] = await db.select().from(brands).where(eq(brands.id, id));
    return newBrand;
  }

  async deleteBrand(id: number): Promise<void> {
    const [defaultBrand] = await db.select().from(brands).where(eq(brands.name, "Generic")).limit(1);
    if (!defaultBrand) throw new BusinessError(500, "DEFAULT_BRAND_MISSING", "Default brand tidak ditemukan");
    if (Number(defaultBrand.id) === Number(id)) {
      throw new BusinessError(409, "DEFAULT_BRAND_PROTECTED", "Default brand tidak boleh dihapus");
    }

    await db.update(products).set({ brandId: defaultBrand.id as any }).where(eq(products.brandId, id));
    await db.delete(brands).where(eq(brands.id, id));
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(category: Partial<Category>): Promise<Category> {
    const [result] = await db.insert(categories).values(category as any);
    const id = result.insertId;
    const [created] = await db.select().from(categories).where(eq(categories.id, id));
    return created;
  }

  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers);
  }

  async createSupplier(supplier: Partial<Supplier>): Promise<Supplier> {
    const [result] = await db.insert(suppliers).values(supplier as any);
    const id = result.insertId;
    const [created] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return created;
  }

  async getCustomers(params?: {
    search?: string;
    status?: "ACTIVE" | "INACTIVE";
    tierLevel?: "REGULAR" | "SILVER" | "GOLD" | "PLATINUM";
    customerType?: "regular" | "member" | "vip";
    page?: number;
    pageSize?: number;
    sortBy?: "createdAt" | "name" | "phone" | "totalPoints" | "totalSpending" | "tierLevel";
    sortDir?: "asc" | "desc";
  }): Promise<{ items: Customer[]; page: number; pageSize: number; total: number }> {
    const page = Math.max(1, Number(params?.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(params?.pageSize ?? 20)));
    const offset = (page - 1) * pageSize;

    const conditions: any[] = [];
    if (params?.search?.trim()) {
      const s = params.search.trim();
      conditions.push(sql`(${customers.name} LIKE ${`%${s}%`} OR ${customers.phone} LIKE ${`%${s}%`})`);
    }
    if (params?.status) conditions.push(eq(customers.status, params.status));
    if (params?.tierLevel) conditions.push(eq(customers.tierLevel, params.tierLevel));
    if (params?.customerType) conditions.push(eq(customers.customerType, params.customerType));

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [countRow] = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(customers)
      .where(whereClause as any);
    const total = Number(countRow?.count ?? 0);

    const dirFn = params?.sortDir === "asc" ? asc : desc;
    const sortBy = params?.sortBy ?? "createdAt";
    const sortCol =
      sortBy === "name"
        ? customers.name
        : sortBy === "phone"
          ? customers.phone
          : sortBy === "totalPoints"
            ? customers.totalPoints
            : sortBy === "totalSpending"
              ? customers.totalSpending
              : sortBy === "tierLevel"
                ? customers.tierLevel
                : customers.createdAt;

    let query = db.select().from(customers) as any;
    if (whereClause) query = query.where(whereClause);
    query = query.orderBy(dirFn(sortCol)).limit(pageSize).offset(offset);

    const items = await query;
    return { items, page, pageSize, total };
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async getCustomerTransactions(customerId: number, params?: { page?: number; pageSize?: number }): Promise<{ items: Sale[]; page: number; pageSize: number; total: number } | undefined> {
    const [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, customerId)).limit(1);
    if (!customer) return undefined;

    const page = Math.max(1, Number(params?.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(params?.pageSize ?? 20)));
    const offset = (page - 1) * pageSize;

    const [countRow] = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(sales)
      .where(eq(sales.customerId, customerId));
    const total = Number(countRow?.count ?? 0);

    const items = await db
      .select()
      .from(sales)
      .where(eq(sales.customerId, customerId))
      .orderBy(desc(sales.transactionDate))
      .limit(pageSize)
      .offset(offset);

    return { items, page, pageSize, total };
  }

  async getCustomerPointHistory(customerId: number, params?: { page?: number; pageSize?: number }): Promise<{ items: { id: number; customerId: number; transactionId: number | null; pointEarned: number; pointUsed: number; description: string; createdAt: Date | null }[]; page: number; pageSize: number; total: number } | undefined> {
    const [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, customerId)).limit(1);
    if (!customer) return undefined;

    const page = Math.max(1, Number(params?.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(params?.pageSize ?? 20)));
    const offset = (page - 1) * pageSize;

    const [countRow] = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(pointLogs)
      .where(eq(pointLogs.customerId, customerId));
    const total = Number(countRow?.count ?? 0);

    const rows = await db
      .select()
      .from(pointLogs)
      .where(eq(pointLogs.customerId, customerId))
      .orderBy(desc(pointLogs.createdAt))
      .limit(pageSize)
      .offset(offset);

    const items = rows.map((r) => {
      const change = Number(r.pointsChange ?? 0);
      return {
        id: r.id,
        customerId: r.customerId,
        transactionId: r.saleId != null ? Number(r.saleId) : null,
        pointEarned: change > 0 ? change : 0,
        pointUsed: change < 0 ? Math.abs(change) : 0,
        description: String(r.reason ?? ""),
        createdAt: (r as any).createdAt ?? null,
      };
    });

    return { items, page, pageSize, total };
  }

  async createCustomer(customer: Partial<Customer>): Promise<Customer> {
    const [result] = await db.insert(customers).values(customer as any);
    const id = result.insertId;
    const [newCustomer] = await db.select().from(customers).where(eq(customers.id, id));
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | undefined> {
    await db.update(customers).set({ ...customer, updatedAt: new Date() } as any).where(eq(customers.id, id));
    const [updated] = await db.select().from(customers).where(eq(customers.id, id));
    return updated;
  }

  async deleteCustomer(id: number): Promise<void> {
    const [existingSale] = await db.select({ id: sales.id }).from(sales).where(eq(sales.customerId, id)).limit(1);
    if (existingSale) {
      await db
        .update(customers)
        .set({ status: "INACTIVE", deletedAt: new Date(), updatedAt: new Date() } as any)
        .where(eq(customers.id, id));
      return;
    }
    await db.delete(customers).where(eq(customers.id, id));
  }

  async updateCustomerPoints(id: number, points: number): Promise<Customer> {
    await db.update(customers)
      .set({ totalPoints: sql`${customers.totalPoints} + ${points}` })
      .where(eq(customers.id, id));
    
    const [updated] = await db.select().from(customers).where(eq(customers.id, id));
    return updated;
  }

  async getActiveCashierShift(userId: number): Promise<CashierShift | undefined> {
    const [shift] = await db
      .select()
      .from(cashierShifts)
      .where(and(eq(cashierShifts.userId, userId), inArray(cashierShifts.status, ["OPEN", "ACTIVE"])));
    return shift;
  }

  async openCashierShift(userId: number, openingCash: number, note?: string, terminalName?: string, ipAddress?: string, userAgent?: string, clientOpenedAt?: Date): Promise<CashierShift> {
    const cleanedNote = note?.trim() ? note.trim().slice(0, 255) : null;
    const cleanedTerminalName = terminalName?.trim() ? terminalName.trim().slice(0, 255) : null;
    const cleanedIp = ipAddress?.trim() ? ipAddress.trim().slice(0, 45) : null;
    const cleanedUserAgent = userAgent?.trim() ? userAgent.trim().slice(0, 255) : null;
    const openedAtFromClient =
      clientOpenedAt && Math.abs(Date.now() - clientOpenedAt.getTime()) <= 36 * 60 * 60 * 1000
        ? clientOpenedAt
        : undefined;

    return await db.transaction(async (tx) => {
      if (!cleanedTerminalName) {
        throw new BusinessError(400, "TERMINAL_REQUIRED", "Terminal wajib diisi");
      }
      const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) throw new BusinessError(404, "NOT_FOUND", "User tidak ditemukan");

      const [existing] = await tx
        .select()
        .from(cashierShifts)
        .where(and(eq(cashierShifts.userId, userId), inArray(cashierShifts.status, ["OPEN", "ACTIVE"])))
        .limit(1);

      if (existing) throw new BusinessError(409, "SHIFT_ALREADY_ACTIVE", "Kasir masih memiliki shift aktif");

      const [terminalActive] = await tx
        .select({ id: cashierShifts.id })
        .from(cashierShifts)
        .where(and(eq(cashierShifts.terminalName, cleanedTerminalName), inArray(cashierShifts.status, ["OPEN", "ACTIVE"])))
        .limit(1);
      if (terminalActive) throw new BusinessError(409, "TERMINAL_ALREADY_ACTIVE", "Terminal masih memiliki shift aktif");

      const values: any = {
        userId,
        userName: user.fullName,
        userRole: user.role,
        ipAddress: cleanedIp,
        userAgent: cleanedUserAgent,
        openingCash: String(openingCash),
        note: cleanedNote,
        terminalName: cleanedTerminalName,
        status: "OPEN",
      };
      if (openedAtFromClient) values.openedAt = openedAtFromClient;

      const [result] = await tx.insert(cashierShifts).values(values);

      const id = result.insertId;
      await tx
        .update(cashierShifts)
        .set({
          shiftCode: sql`CONCAT('SHF-', DATE_FORMAT(${cashierShifts.openedAt}, '%Y%m%d'), '-', ${cashierShifts.userId}, '-', LPAD(${cashierShifts.id}, 6, '0'))`,
        } as any)
        .where(eq(cashierShifts.id, id));
      const [created] = await tx.select().from(cashierShifts).where(eq(cashierShifts.id, id));
      return created;
    });
  }

  async closeCashierShift(userId: number, actualCash: number, closeNote?: string): Promise<{ shift: CashierShift; summary: CashierShiftSummary }> {
    return await db.transaction(async (tx) => {
      const cashDiffApprovalThreshold = Number(process.env.SHIFT_CASH_DIFF_APPROVAL_THRESHOLD ?? 100000);
      const cleanedCloseNote = closeNote?.trim() ? closeNote.trim().slice(0, 255) : null;

      const [pending] = await tx
        .select({ id: suspendedSales.id })
        .from(suspendedSales)
        .where(eq(suspendedSales.cashierId, userId))
        .limit(1);
      if (pending) {
        throw new BusinessError(
          409,
          "PENDING_SUSPENDED_SALES",
          "Tidak bisa tutup shift: masih ada transaksi ditunda. Selesaikan atau hapus transaksi tersimpan terlebih dahulu."
        );
      }

      const [shift] = await tx
        .select()
        .from(cashierShifts)
        .where(and(eq(cashierShifts.userId, userId), inArray(cashierShifts.status, ["OPEN", "ACTIVE"])))
        .limit(1);

      if (!shift) {
        throw new BusinessError(409, "NO_ACTIVE_SHIFT", "Tidak ada shift aktif untuk ditutup");
      }

      const openingCash = Number(shift.openingCash ?? 0);
      const summary = await this.computeCashierShiftSummaryTx(tx, shift.id, openingCash);
      const cashDifference = actualCash - summary.expectedCash;
      if (Math.abs(cashDifference) >= 0.01 && !cleanedCloseNote) {
        throw new BusinessError(400, "CLOSE_NOTE_REQUIRED", "Catatan/alasan wajib diisi jika ada selisih kas");
      }
      const approvalStatus = Math.abs(cashDifference) >= cashDiffApprovalThreshold ? "PENDING" : "NONE";

      const [updateResult] = await tx
        .update(cashierShifts)
        .set({
          closedAt: sql`CURRENT_TIMESTAMP`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
          expectedCash: String(summary.expectedCash),
          systemCashTotal: String(summary.expectedCash),
          actualCash: String(actualCash),
          cashDifference: String(cashDifference),
          closeNote: cleanedCloseNote,
          totalTransactions: summary.totalTransactions,
          totalSales: String(summary.totalSales),
          totalRefund: String(summary.totalRefunds),
          cashRefunds: String(summary.cashRefunds),
          nonCashRefunds: String(summary.nonCashRefunds),
          totalDiscount: String(summary.totalDiscount),
          totalPointUsed: summary.totalPointUsed,
          totalPointEarned: summary.totalPointEarned,
          pointsReversed: summary.pointsReversed,
          pointsRestored: summary.pointsRestored,
          totalCashSales: String(summary.cashSales),
          totalNonCashSales: String(summary.nonCashSales),
          totalVoid: summary.totalVoid,
          totalReturns: summary.totalReturns,
          pointTxCount: summary.pointTxCount,
          bigDiscountTxCount: summary.bigDiscountTxCount,
          paymentBreakdown: JSON.stringify(summary.paymentBreakdown),
          approvalStatus,
          status: "CLOSED",
        } as any)
        .where(and(eq(cashierShifts.id, shift.id), inArray(cashierShifts.status, ["OPEN", "ACTIVE"])));

      if (!updateResult?.affectedRows) {
        throw new BusinessError(409, "SHIFT_ALREADY_CLOSED", "Shift sudah ditutup");
      }

      const [updated] = await tx.select().from(cashierShifts).where(eq(cashierShifts.id, shift.id));
      return { shift: updated, summary };
    });
  }

  async approveCashierShift(shiftId: number, approvedBy: number, approvalNote?: string): Promise<CashierShift> {
    const cleanedNote = approvalNote?.trim() ? approvalNote.trim().slice(0, 255) : null;
    return await db.transaction(async (tx) => {
      const [shift] = await tx.select().from(cashierShifts).where(eq(cashierShifts.id, shiftId)).limit(1);
      if (!shift) throw new BusinessError(404, "NOT_FOUND", "Shift tidak ditemukan");
      if (String(shift.status ?? "") !== "CLOSED") throw new BusinessError(409, "SHIFT_NOT_CLOSED", "Shift belum ditutup");
      if (String((shift as any).approvalStatus ?? "NONE") !== "PENDING") throw new BusinessError(409, "SHIFT_NOT_PENDING", "Shift tidak dalam status menunggu approval");

      await tx.update(cashierShifts).set({
        approvalStatus: "APPROVED",
        approvedBy,
        approvedAt: new Date(),
        approvalNote: cleanedNote,
        updatedAt: new Date(),
      } as any).where(eq(cashierShifts.id, shiftId));

      await tx.insert(auditLogs).values({
        entityType: "SHIFT",
        entityId: shiftId,
        action: "SHIFT_APPROVED",
        actorId: approvedBy,
        metadata: JSON.stringify({ shiftId, shiftCode: shift.shiftCode ?? null, approvalNote: cleanedNote }),
        createdAt: new Date(),
      } as any);

      const [updated] = await tx.select().from(cashierShifts).where(eq(cashierShifts.id, shiftId));
      return updated;
    });
  }

  async listCashierShifts(filters?: { startDate?: Date; endDate?: Date; cashierName?: string; role?: string; status?: "OPEN" | "CLOSED" | "ACTIVE"; approvalStatus?: "NONE" | "PENDING" | "APPROVED" | "REJECTED"; diffLargeOnly?: boolean; search?: string }): Promise<(CashierShift & { user: SafeUser | null })[]> {
    let query = db
      .select({
        id: cashierShifts.id,
        shiftCode: cashierShifts.shiftCode,
        userId: cashierShifts.userId,
        userName: cashierShifts.userName,
        userRole: cashierShifts.userRole,
        ipAddress: cashierShifts.ipAddress,
        userAgent: cashierShifts.userAgent,
        openedAt: cashierShifts.openedAt,
        closedAt: cashierShifts.closedAt,
        createdAt: cashierShifts.createdAt,
        updatedAt: cashierShifts.updatedAt,
        openingCash: cashierShifts.openingCash,
        expectedCash: cashierShifts.expectedCash,
        systemCashTotal: cashierShifts.systemCashTotal,
        actualCash: cashierShifts.actualCash,
        cashDifference: cashierShifts.cashDifference,
        totalTransactions: cashierShifts.totalTransactions,
        totalSales: cashierShifts.totalSales,
        totalRefund: cashierShifts.totalRefund,
        cashRefunds: cashierShifts.cashRefunds,
        nonCashRefunds: cashierShifts.nonCashRefunds,
        totalDiscount: cashierShifts.totalDiscount,
        totalPointUsed: cashierShifts.totalPointUsed,
        totalPointEarned: cashierShifts.totalPointEarned,
        pointsReversed: cashierShifts.pointsReversed,
        pointsRestored: cashierShifts.pointsRestored,
        totalCashSales: cashierShifts.totalCashSales,
        totalNonCashSales: cashierShifts.totalNonCashSales,
        totalVoid: cashierShifts.totalVoid,
        totalReturns: cashierShifts.totalReturns,
        pointTxCount: cashierShifts.pointTxCount,
        bigDiscountTxCount: cashierShifts.bigDiscountTxCount,
        approvalStatus: cashierShifts.approvalStatus,
        approvedBy: cashierShifts.approvedBy,
        approvedAt: cashierShifts.approvedAt,
        approvalNote: cashierShifts.approvalNote,
        paymentBreakdown: cashierShifts.paymentBreakdown,
        note: cashierShifts.note,
        closeNote: cashierShifts.closeNote,
        terminalName: cashierShifts.terminalName,
        status: cashierShifts.status,
        user: {
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          role: users.role,
          createdAt: users.createdAt,
        },
      })
      .from(cashierShifts)
      .leftJoin(users, eq(cashierShifts.userId, users.id));

    const conditions = [];
    if (filters?.status) {
      const st = filters.status === "ACTIVE" ? "OPEN" : filters.status;
      conditions.push(eq(cashierShifts.status, st as any));
    }
    if (filters?.role) conditions.push(eq(cashierShifts.userRole, filters.role));
    if (filters?.cashierName) conditions.push(sql`${cashierShifts.userName} LIKE ${`%${filters.cashierName}%`}`);
    if (filters?.startDate) conditions.push(sql`${cashierShifts.openedAt} >= ${filters.startDate}`);
    if (filters?.endDate) conditions.push(sql`${cashierShifts.openedAt} <= ${filters.endDate}`);
    if (filters?.approvalStatus) conditions.push(eq(cashierShifts.approvalStatus, filters.approvalStatus));
    if (filters?.diffLargeOnly === true) {
      const threshold = Number(process.env.SHIFT_CASH_DIFF_LARGE_THRESHOLD ?? 100000);
      conditions.push(sql`ABS(COALESCE(${cashierShifts.cashDifference}, 0)) >= ${threshold}`);
    }
    if (filters?.search?.trim()) {
      const like = `%${filters.search.trim()}%`;
      conditions.push(sql`(
        ${cashierShifts.shiftCode} LIKE ${like}
        OR ${cashierShifts.userName} LIKE ${like}
        OR ${cashierShifts.terminalName} LIKE ${like}
      )`);
    }
    if (conditions.length) {
      // @ts-ignore
      query = query.where(and(...conditions));
    }

    // @ts-ignore
    const rows = await query.orderBy(desc(cashierShifts.openedAt));
    return rows.map((row) => ({
      ...row,
      user: row.user?.id != null ? row.user : null,
    }));
  }

  async getCashierShiftTransactions(id: number): Promise<{ id: number; invoiceNo: string; transactionDate: Date | null; paymentMethod: string; finalAmount: string; status: "COMPLETED" | "CANCELLED" | "RETURN" | "REFUNDED" | "PARTIAL_REFUND" }[] | undefined> {
    const [shift] = await db.select({ id: cashierShifts.id }).from(cashierShifts).where(eq(cashierShifts.id, id)).limit(1);
    if (!shift) return undefined;

    const saleRows = await db
      .select({
        id: sales.id,
        invoiceNo: sales.invoiceNo,
        transactionDate: sales.transactionDate,
        paymentMethod: sales.paymentMethod,
        finalAmount: sales.finalAmount,
        status: sales.status,
      })
      .from(sales)
      .where(eq(sales.shiftId, id));

    const returnRows = await db
      .select({
        id: returns.id,
        invoiceNo: returns.returnNumber,
        transactionDate: returns.returnDate,
        paymentMethod: returns.refundMethod,
        finalAmount: returns.totalRefund,
        status: returns.status,
      })
      .from(returns)
      .where(eq(returns.shiftId, id));

    const formattedSales = saleRows.map((r) => ({
      ...r,
      // @ts-ignore
      status: r.status as any,
    }));

    const formattedReturns = returnRows.map((r) => ({
      ...r,
      finalAmount: `-${r.finalAmount}`,
      status: "RETURN" as const,
    }));

    const allTransactions = [...formattedSales, ...formattedReturns].sort((a, b) => {
      const dateA = a.transactionDate ? new Date(a.transactionDate).getTime() : 0;
      const dateB = b.transactionDate ? new Date(b.transactionDate).getTime() : 0;
      return dateB - dateA;
    });

    return allTransactions;
  }

  async getCashierShiftSummary(id: number): Promise<{ shift: CashierShift & { user: SafeUser | null }; summary: CashierShiftSummary } | undefined> {
    const [row] = await db
      .select({
        shift: cashierShifts,
        user: {
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          role: users.role,
          createdAt: users.createdAt,
        },
      })
      .from(cashierShifts)
      .leftJoin(users, eq(cashierShifts.userId, users.id))
      .where(eq(cashierShifts.id, id));

    if (!row) return undefined;
    const safeUser = row.user?.id != null ? row.user : null;
    const isClosed = String(row.shift.status ?? "") === "CLOSED";
    if (isClosed) {
      let paymentBreakdown: Record<string, number> = {};
      try {
        const parsed = row.shift.paymentBreakdown ? JSON.parse(String(row.shift.paymentBreakdown)) : {};
        if (parsed && typeof parsed === "object") paymentBreakdown = parsed;
      } catch {
        paymentBreakdown = {};
      }
      const summary: CashierShiftSummary = {
        totalTransactions: Number(row.shift.totalTransactions ?? 0),
        totalSales: Number(row.shift.totalSales ?? 0),
        cashSales: Number(row.shift.totalCashSales ?? 0),
        nonCashSales: Number(row.shift.totalNonCashSales ?? 0),
        totalRefunds: Number(row.shift.totalRefund ?? 0),
        cashRefunds: Number((row.shift as any).cashRefunds ?? 0),
        nonCashRefunds: Number((row.shift as any).nonCashRefunds ?? 0),
        expectedCash: Number(row.shift.systemCashTotal ?? row.shift.expectedCash ?? 0),
        paymentBreakdown,
        totalDiscount: Number(row.shift.totalDiscount ?? 0),
        totalPointUsed: Number(row.shift.totalPointUsed ?? 0),
        totalPointEarned: Number(row.shift.totalPointEarned ?? 0),
        totalVoid: Number(row.shift.totalVoid ?? 0),
        totalReturns: Number(row.shift.totalReturns ?? 0),
        pointTxCount: Number((row.shift as any).pointTxCount ?? 0),
        bigDiscountTxCount: Number((row.shift as any).bigDiscountTxCount ?? 0),
        pointsReversed: Number((row.shift as any).pointsReversed ?? 0),
        pointsRestored: Number((row.shift as any).pointsRestored ?? 0),
      };
      return { shift: { ...row.shift, user: safeUser }, summary };
    }

    const openingCash = Number(row.shift.openingCash ?? 0);
    const summary = await this.computeCashierShiftSummaryTx(db, row.shift.id, openingCash);
    return { shift: { ...row.shift, user: safeUser }, summary };
  }

  async createSale(data: CheckoutRequest, cashierId: number): Promise<Sale & { items: SaleItem[] }> {
    return await db.transaction(async (tx) => {
      if (!data.items?.length) throw new Error("Cart is empty");

      const [activeShift] = await tx
        .select()
        .from(cashierShifts)
        .where(and(eq(cashierShifts.userId, cashierId), inArray(cashierShifts.status, ["OPEN", "ACTIVE"])))
        .limit(1);
      if (!activeShift) throw new Error("Shift kasir belum dibuka");

      const now = new Date();
      const [loyaltyCfgRow] = await tx
        .select()
        .from(loyaltySettings)
        .where(eq(loyaltySettings.id, 1))
        .limit(1);

      const loyaltyCfg = loyaltyCfgRow
        ? {
            earnAmountPerPoint: Number(loyaltyCfgRow.earnAmountPerPoint),
            redeemAmountPerPoint: Number(loyaltyCfgRow.redeemAmountPerPoint),
            silverMinSpending: Number(loyaltyCfgRow.silverMinSpending),
            goldMinSpending: Number(loyaltyCfgRow.goldMinSpending),
            platinumMinSpending: Number(loyaltyCfgRow.platinumMinSpending),
            silverPointMultiplier: Number(loyaltyCfgRow.silverPointMultiplier),
            goldPointMultiplier: Number(loyaltyCfgRow.goldPointMultiplier),
            platinumPointMultiplier: Number(loyaltyCfgRow.platinumPointMultiplier),
          }
        : {
            earnAmountPerPoint: 10000,
            redeemAmountPerPoint: 100,
            silverMinSpending: 1000000,
            goldMinSpending: 5000000,
            platinumMinSpending: 10000000,
            silverPointMultiplier: 1.0,
            goldPointMultiplier: 1.25,
            platinumPointMultiplier: 1.5,
          };

      const computeTierLevel = (totalSpending: number) => {
        if (totalSpending >= loyaltyCfg.platinumMinSpending) return "PLATINUM" as const;
        if (totalSpending >= loyaltyCfg.goldMinSpending) return "GOLD" as const;
        if (totalSpending >= loyaltyCfg.silverMinSpending) return "SILVER" as const;
        return "REGULAR" as const;
      };

      const getTierMultiplier = (tierLevel: string | null | undefined) => {
        if (tierLevel === "PLATINUM") return loyaltyCfg.platinumPointMultiplier;
        if (tierLevel === "GOLD") return loyaltyCfg.goldPointMultiplier;
        if (tierLevel === "SILVER") return loyaltyCfg.silverPointMultiplier;
        return 1.0;
      };

      const computeDiscountAmount = (baseAmount: number, type: string, value: number) => {
        const raw = type === "percentage" ? baseAmount * (value / 100) : value;
        return Math.max(0, Math.min(baseAmount, raw));
      };

      const [customer] = data.customerId
        ? await tx.select().from(customers).where(eq(customers.id, data.customerId)).limit(1)
        : [undefined];
      if (data.customerId && !customer) throw new BusinessError(404, "NOT_FOUND", "Customer tidak ditemukan");
      if (customer && customer.status !== "ACTIVE") throw new BusinessError(409, "CUSTOMER_INACTIVE", "Customer tidak aktif");

      const activeDiscounts = await tx
        .select()
        .from(discounts)
        .where(
          and(
            eq(discounts.active, true),
            eq(discounts.status, "ACTIVE"),
            sql`(${discounts.startDate} IS NULL OR ${discounts.startDate} <= ${now})`,
            sql`(${discounts.endDate} IS NULL OR ${discounts.endDate} >= ${now})`,
          ),
        );

      let subtotal = 0;
      let totalItemDiscount = 0;
      const preparedItems = [];

      for (const item of data.items) {
        const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
        
        if (!product) throw new Error(`Product ${item.productId} not found`);

        const unitType = item.unitType ?? "PCS";
        const pcsPerCarton = Math.max(1, Number(product.pcsPerCarton ?? 1));
        const supportsCarton = Boolean(product.supportsCarton) || pcsPerCarton > 1;

        let conversionQty = item.quantity;
        let unitPrice = Number(product.price);
        if (unitType === "CARTON") {
          if (!supportsCarton || pcsPerCarton <= 1) throw new Error(`Product ${product.name} does not support carton sales`);
          if (product.cartonPrice == null) throw new Error(`Carton price not set for ${product.name}`);
          unitPrice = Number(product.cartonPrice);
          conversionQty = item.quantity * pcsPerCarton;
        }

        if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error(`Invalid price for ${product.name}`);
        if (!Number.isInteger(conversionQty) || conversionQty < 1) throw new Error(`Invalid quantity for ${product.name}`);

        const lineAmount = unitPrice * item.quantity;

        const applicableDiscounts = activeDiscounts
          .map((d) => {
            const hasTargets = d.productId != null || d.brandId != null || (d as any).categoryId != null;
            const appliesTo = hasTargets && d.appliesTo === "global" ? "product" : d.appliesTo;
            return { ...d, appliesTo, hasTargets };
          })
          .filter((d) => {
            if (d.customerType != null) {
              if (!customer) return false;
              if (String(customer.customerType) !== String(d.customerType)) return false;
            }
            const minPurchase = Number(d.minimumPurchase ?? 0);
            if (minPurchase > 0 && lineAmount < minPurchase) return false;

            if (d.appliesTo !== "product" && d.appliesTo !== "category") return false;
            const productMatch = d.productId != null && Number(d.productId) === Number(product.id);
            const brandMatch = d.brandId != null && product.brandId != null && Number(d.brandId) === Number(product.brandId);
            const categoryMatch = (d as any).categoryId != null && product.categoryId != null && Number((d as any).categoryId) === Number(product.categoryId);
            return productMatch || brandMatch || categoryMatch;
          })
          .map((d) => {
            const perUnit = computeDiscountAmount(unitPrice, String(d.type), Number(d.value));
            const amount = Math.min(lineAmount, perUnit * item.quantity);
            return {
              id: d.id,
              amount,
              priority: Number(d.priorityLevel ?? 0),
              stackable: Boolean(d.stackable),
            };
          })
          .filter((x) => x.amount > 0);

        let lineDiscount = 0;
        let appliedDiscountId: number | null = null;

        const nonStackable = applicableDiscounts.filter((d) => !d.stackable);
        if (nonStackable.length) {
          nonStackable.sort((a, b) => (b.priority - a.priority) || (b.amount - a.amount) || (a.id - b.id));
          const best = nonStackable[0];
          lineDiscount = best.amount;
          appliedDiscountId = best.id;
        } else if (applicableDiscounts.length) {
          applicableDiscounts.sort((a, b) => (b.priority - a.priority) || (b.amount - a.amount) || (a.id - b.id));
          appliedDiscountId = applicableDiscounts[0]?.id ?? null;
          lineDiscount = Math.min(lineAmount, applicableDiscounts.reduce((sum, d) => sum + d.amount, 0));
        }

        totalItemDiscount += lineDiscount;

        const itemSubtotal = Math.max(0, lineAmount - lineDiscount);
        subtotal += itemSubtotal;

        const [stockResult] = await tx.update(products)
          .set({ stock: sql`${products.stock} - ${conversionQty}` })
          .where(and(
            eq(products.id, item.productId),
            gte(products.stock, conversionQty)
          ));

        if (!stockResult?.affectedRows) {
          throw new BusinessError(409, "INSUFFICIENT_STOCK", `Stok tidak cukup untuk ${product.name}`, {
            productId: product.id,
            productName: product.name,
            requiredQty: conversionQty,
            availableQty: Number(product.stock ?? 0),
            unitType,
          });
        }

        preparedItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitType,
          conversionQty,
          priceAtSale: String(unitPrice),
          discountAtSale: String(lineDiscount),
          appliedDiscountId,
          subtotal: String(itemSubtotal),
        });
      }

      const globalCandidates = activeDiscounts
        .map((d) => {
          const hasTargets = d.productId != null || d.brandId != null || (d as any).categoryId != null;
          const appliesTo = hasTargets && d.appliesTo === "global" ? "product" : d.appliesTo;
          return { ...d, appliesTo, hasTargets };
        })
        .filter((d) => {
          if (d.appliesTo !== "global" && d.appliesTo !== "customer") return false;
          if (d.customerType != null) {
            if (!customer) return false;
            if (String(customer.customerType) !== String(d.customerType)) return false;
          }
          if (d.appliesTo === "customer" && !customer) return false;
          const minPurchase = Number(d.minimumPurchase ?? 0);
          if (minPurchase > 0 && subtotal < minPurchase) return false;
          return true;
        })
        .map((d) => {
          const amount = computeDiscountAmount(subtotal, String(d.type), Number(d.value));
          return {
            id: d.id,
            amount,
            priority: Number(d.priorityLevel ?? 0),
            stackable: Boolean(d.stackable),
          };
        })
        .filter((x) => x.amount > 0);

      let globalDiscountAmount = 0;
      let appliedGlobalDiscountId: number | null = null;
      const nonStackableGlobal = globalCandidates.filter((d) => !d.stackable);
      if (nonStackableGlobal.length) {
        nonStackableGlobal.sort((a, b) => (b.priority - a.priority) || (b.amount - a.amount) || (a.id - b.id));
        const best = nonStackableGlobal[0];
        globalDiscountAmount = best.amount;
        appliedGlobalDiscountId = best.id;
      } else if (globalCandidates.length) {
        globalCandidates.sort((a, b) => (b.priority - a.priority) || (b.amount - a.amount) || (a.id - b.id));
        appliedGlobalDiscountId = globalCandidates[0]?.id ?? null;
        globalDiscountAmount = Math.min(subtotal, globalCandidates.reduce((sum, d) => sum + d.amount, 0));
      }

      const amountAfterDiscounts = Math.max(0, subtotal - globalDiscountAmount);

      let redeemedPoints = Math.max(0, Number(data.pointsToRedeem ?? 0));
      if (redeemedPoints > 0 && !customer) throw new BusinessError(400, "CUSTOMER_REQUIRED", "Pilih customer untuk menggunakan poin");

      const maxPointsByAmount =
        loyaltyCfg.redeemAmountPerPoint > 0 ? Math.floor(amountAfterDiscounts / loyaltyCfg.redeemAmountPerPoint) : 0;
      redeemedPoints = Math.min(redeemedPoints, Math.max(0, maxPointsByAmount));
      const redeemedAmount = redeemedPoints * loyaltyCfg.redeemAmountPerPoint;
      const shouldLogRedemption = customer && redeemedPoints > 0;

      if (customer && redeemedPoints > 0) {
        const [redeemResult] = await tx
          .update(customers)
          .set({ totalPoints: sql`${customers.totalPoints} - ${redeemedPoints}`, updatedAt: new Date() } as any)
          .where(and(eq(customers.id, customer.id), gte(customers.totalPoints, redeemedPoints)));

        if (!redeemResult?.affectedRows) {
          throw new BusinessError(409, "POINTS_NOT_ENOUGH", "Poin customer tidak cukup");
        }
      }

      const finalAmount = Math.max(0, amountAfterDiscounts - redeemedAmount);
      const totalDiscount = totalItemDiscount + globalDiscountAmount;

      let pointsEarned = 0;
      if (customer) {
        const multiplier = getTierMultiplier(customer.tierLevel);
        const base = loyaltyCfg.earnAmountPerPoint > 0 ? Math.floor(finalAmount / loyaltyCfg.earnAmountPerPoint) : 0;
        pointsEarned = Math.max(0, Math.floor(base * multiplier));
      }
      
      // Simple Invoice Number Gen
      const invoiceNo = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const [saleResult] = await tx.insert(sales).values({
        invoiceNo,
        shiftId: activeShift.id,
        cashierId,
        customerId: data.customerId,
        subtotal: String(subtotal),
        discountAmount: String(totalDiscount),
        itemDiscountAmount: String(totalItemDiscount),
        globalDiscountAmount: String(globalDiscountAmount),
        appliedGlobalDiscountId,
        redeemedPoints,
        redeemedAmount: String(redeemedAmount),
        pointsEarned,
        finalAmount: String(finalAmount),
        paymentMethod: data.paymentMethod,
        status: "COMPLETED",
      });
      
      const saleId = saleResult.insertId;
      const [sale] = await tx.select().from(sales).where(eq(sales.id, saleId));

      if (shouldLogRedemption) {
        await tx.insert(pointLogs).values({
          customerId: customer!.id,
          saleId: sale.id,
          pointsChange: -redeemedPoints,
          reason: "Point Redeem",
        } as any);
      }

      // 3. Insert Sale Items
      const createdItems = [];
      for (const item of preparedItems) {
        const [itemResult] = await tx.insert(saleItems).values({
          saleId: sale.id,
          productId: item.productId,
          quantity: item.quantity,
          unitType: item.unitType,
          conversionQty: item.conversionQty,
          priceAtSale: item.priceAtSale,
          discountAtSale: item.discountAtSale,
          appliedDiscountId: item.appliedDiscountId,
          subtotal: item.subtotal,
        });
        // Construct the item object manually or fetch if needed. 
        // fetching inside loop is expensive but safe.
        // For optimization we can assume success and return constructed object with id.
        createdItems.push({
          id: itemResult.insertId,
          saleId: sale.id,
          productId: item.productId,
          quantity: item.quantity,
          unitType: item.unitType,
          conversionQty: item.conversionQty,
          priceAtSale: item.priceAtSale,
          discountAtSale: item.discountAtSale,
          appliedDiscountId: item.appliedDiscountId,
          subtotal: item.subtotal,
        });
      }

      if (customer) {
        const spendingDelta = finalAmount;
        const nextTotalSpending = Math.max(0, Number(customer.totalSpending ?? 0) + spendingDelta);
        const nextTier = computeTierLevel(nextTotalSpending);

        if (pointsEarned > 0) {
          await tx.insert(pointLogs).values({
            customerId: customer.id,
            saleId: sale.id,
            pointsChange: pointsEarned,
            reason: "Purchase Reward",
          } as any);
        }

        await tx
          .update(customers)
          .set({
            totalPoints: sql`${customers.totalPoints} + ${pointsEarned}`,
            totalSpending: sql`${customers.totalSpending} + ${spendingDelta}`,
            tierLevel: nextTier,
            updatedAt: new Date(),
          } as any)
          .where(eq(customers.id, customer.id));
      }

      await tx.insert(auditLogs).values({
        entityType: "SALE",
        entityId: Number(sale.id),
        action: "SALE_CREATED",
        actorId: cashierId,
        metadata: JSON.stringify({
          saleId: Number(sale.id),
          invoiceNo: String(invoiceNo),
          shiftId: Number(activeShift.id),
          customerId: sale.customerId ?? null,
          subtotal: Number(subtotal),
          itemDiscountAmount: Number(totalItemDiscount),
          globalDiscountAmount: Number(globalDiscountAmount),
          redeemedPoints,
          redeemedAmount: Number(redeemedAmount),
          pointsEarned,
          finalAmount: Number(finalAmount),
          paymentMethod: String(data.paymentMethod ?? ""),
          itemsCount: preparedItems.length,
        }),
        createdAt: new Date(),
      } as any);

      return { ...sale, items: createdItems };
    });
  }

  async getSales(
    params?: {
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
    },
    context?: { userId: number; role: string }
  ): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, Number(params?.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(params?.pageSize ?? 20)));
    const offset = (page - 1) * pageSize;

    const conditions: any[] = [];

    if (params?.startDate) {
      const d = new Date(params.startDate);
      if (!Number.isNaN(d.getTime())) conditions.push(sql`${sales.transactionDate} >= ${d.toISOString()}`);
    }
    if (params?.endDate) {
      const d = new Date(params.endDate);
      if (!Number.isNaN(d.getTime())) conditions.push(sql`${sales.transactionDate} <= ${d.toISOString()}`);
    }
    if (params?.customerId != null) conditions.push(eq(sales.customerId, Number(params.customerId)));
    if (params?.tier) conditions.push(eq(customers.tierLevel, String(params.tier)));
    if (params?.paymentMethod) conditions.push(eq(sales.paymentMethod, String(params.paymentMethod)));
    if (params?.status) conditions.push(eq(sales.status, String(params.status)));
    if (params?.cashierId != null) conditions.push(eq(sales.cashierId, Number(params.cashierId)));
    if (params?.usedPoints === true) conditions.push(sql`COALESCE(${sales.redeemedPoints}, 0) > 0`);
    if (params?.usedPoints === false) conditions.push(sql`COALESCE(${sales.redeemedPoints}, 0) = 0`);

    if (context?.role === "cashier") {
      conditions.push(eq(sales.cashierId, context.userId));
    }

    const search = params?.search?.trim();
    if (search) {
      const like = `%${search}%`;
      conditions.push(sql`(
        ${sales.invoiceNo} LIKE ${like}
        OR ${customers.name} LIKE ${like}
        OR ${customers.phone} LIKE ${like}
        OR CAST(${customers.id} AS CHAR) LIKE ${like}
      )`);
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [countRow] = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .where(whereClause as any);
    const total = Number(countRow?.count ?? 0);

    let query = db
      .select({
        sale: sales,
        cashier: users,
        customer: customers,
        totalItems: sql<number>`(
          SELECT COALESCE(SUM(CASE WHEN si.conversion_qty > 0 THEN si.conversion_qty ELSE si.quantity END), 0)
          FROM sale_items si
          WHERE si.sale_id = ${sales.id}
        )`,
        refundedTotal: sql<string>`(
          SELECT COALESCE(SUM(r.total_refund), 0)
          FROM returns r
          WHERE r.sale_id = ${sales.id}
            AND COALESCE(r.status, 'COMPLETED') = 'COMPLETED'
        )`,
      })
      .from(sales)
      .leftJoin(users, eq(sales.cashierId, users.id))
      .leftJoin(customers, eq(sales.customerId, customers.id)) as any;

    if (whereClause) query = query.where(whereClause);
    query = query.orderBy(desc(sales.transactionDate)).limit(pageSize).offset(offset);
    const rows = await query;

    return {
      items: rows.map((r: any) => ({
        ...r.sale,
        cashier: r.cashier,
        customer: r.customer,
        totalItems: Number(r.totalItems ?? 0),
        refundedTotal: Number(r.refundedTotal ?? 0),
      })),
      total,
      page,
      pageSize,
    };
  }

  async getSale(id: number): Promise<(Sale & {
    items: (SaleItem & { product: Product })[];
    cashier: User | null;
    customer: Customer | null;
    returns: any[];
    auditLogs: AuditLog[];
  }) | undefined> {
    const [sale] = await db.select({
      sale: sales,
      cashier: users,
      customer: customers
    })
    .from(sales)
    .leftJoin(users, eq(sales.cashierId, users.id))
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(eq(sales.id, id));

    if (!sale) return undefined;

    const items = await db.select({
      id: saleItems.id,
      saleId: saleItems.saleId,
      productId: saleItems.productId,
      quantity: saleItems.quantity,
      unitType: saleItems.unitType,
      conversionQty: saleItems.conversionQty,
      priceAtSale: saleItems.priceAtSale,
      discountAtSale: saleItems.discountAtSale,
      subtotal: saleItems.subtotal,
      product: products
    })
    .from(saleItems)
    .innerJoin(products, eq(saleItems.productId, products.id))
    .where(eq(saleItems.saleId, id));

    const saleReturns = await db
      .select()
      .from(returns)
      .where(eq(returns.saleId, id))
      .orderBy(desc(returns.createdAt), desc(returns.returnDate));

    const returnIds = saleReturns.map(r => r.id);
    const saleReturnItems = returnIds.length
      ? await db
          .select({
            id: returnItems.id,
            returnId: returnItems.returnId,
            productId: returnItems.productId,
            quantity: returnItems.quantity,
            subtotal: (returnItems as any).subtotal,
            refundAmount: returnItems.refundAmount,
            product: products,
          })
          .from(returnItems)
          .innerJoin(products, eq(returnItems.productId, products.id))
          .where(inArray(returnItems.returnId, returnIds))
      : [];

    const itemsByReturnId = new Map<number, any[]>();
    for (const r of saleReturnItems as any[]) {
      const list = itemsByReturnId.get(Number(r.returnId)) ?? [];
      list.push({
        id: r.id,
        returnId: r.returnId,
        productId: r.productId,
        quantity: r.quantity,
        subtotal: Number(r.subtotal ?? 0),
        refundAmount: Number(r.refundAmount ?? 0),
        product: r.product,
      });
      itemsByReturnId.set(Number(r.returnId), list);
    }

    const audit = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, "SALE"), eq(auditLogs.entityId, id)))
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id));

    return {
      ...sale.sale,
      cashier: (sale.cashier as any) ?? null,
      customer: (sale.customer as any) ?? null,
      items: items.map((i: any) => {
        const { product, ...rest } = i;
        return { ...rest, product };
      }) as any,
      returns: saleReturns.map(r => ({
        ...r,
        totalRefund: Number(r.totalRefund ?? 0),
        items: itemsByReturnId.get(Number(r.id)) ?? [],
      })),
      auditLogs: audit as any,
    };
  }

  async deleteSale(id: number, cancelledBy?: number, cancelledShiftId?: number): Promise<void> {
    await db.transaction(async (tx) => {
      const [sale] = await tx.select().from(sales).where(eq(sales.id, id));
      if (!sale) return;
      if (sale.status === "CANCELLED") return;
      if (sale.status !== "COMPLETED") throw new BusinessError(409, "SALE_NOT_VOIDABLE", "Transaksi tidak bisa di-void pada status saat ini");

      const [existingReturn] = await tx
        .select({ id: returns.id })
        .from(returns)
        .where(and(eq(returns.saleId, id), eq(returns.status, "COMPLETED")))
        .limit(1);
      if (existingReturn) throw new Error("Tidak bisa membatalkan transaksi: sudah ada retur");

      const saleItemsRows = await tx.select().from(saleItems).where(eq(saleItems.saleId, id));
      const soldQtyByProduct = new Map<number, number>();
      for (const r of saleItemsRows) {
        const restoreQty = Number(r.conversionQty) > 0 ? Number(r.conversionQty) : Number(r.quantity);
        soldQtyByProduct.set(r.productId, (soldQtyByProduct.get(r.productId) ?? 0) + restoreQty);
      }

      for (const [productId, restoreQty] of soldQtyByProduct.entries()) {
        await tx.update(products)
          .set({ stock: sql`${products.stock} + ${restoreQty}` })
          .where(eq(products.id, productId));
      }

      const logs = await tx.select().from(pointLogs).where(eq(pointLogs.saleId, id));
      for (const log of logs) {
        await tx.update(customers)
          .set({ totalPoints: sql`${customers.totalPoints} - ${log.pointsChange}` })
          .where(eq(customers.id, log.customerId));

        await tx.insert(pointLogs).values({
          customerId: log.customerId,
          saleId: id,
          pointsChange: -Number(log.pointsChange),
          reason: `Sale Cancelled: ${id}`,
        } as any);
      }

      if (sale.customerId != null) {
        const [cfgRow] = await tx.select().from(loyaltySettings).where(eq(loyaltySettings.id, 1)).limit(1);
        const cfg = cfgRow
          ? {
              silverMinSpending: Number(cfgRow.silverMinSpending),
              goldMinSpending: Number(cfgRow.goldMinSpending),
              platinumMinSpending: Number(cfgRow.platinumMinSpending),
            }
          : { silverMinSpending: 1000000, goldMinSpending: 5000000, platinumMinSpending: 10000000 };

        const saleAmount = Number(sale.finalAmount ?? 0);
        await tx
          .update(customers)
          .set({
            totalSpending: sql`GREATEST(0, ${customers.totalSpending} - ${saleAmount})`,
            updatedAt: new Date(),
          } as any)
          .where(eq(customers.id, sale.customerId));

        const [updatedCustomer] = await tx
          .select({ totalSpending: customers.totalSpending })
          .from(customers)
          .where(eq(customers.id, sale.customerId))
          .limit(1);

        if (updatedCustomer) {
          const totalSpending = Number(updatedCustomer.totalSpending ?? 0);
          const tierLevel =
            totalSpending >= cfg.platinumMinSpending
              ? "PLATINUM"
              : totalSpending >= cfg.goldMinSpending
                ? "GOLD"
                : totalSpending >= cfg.silverMinSpending
                  ? "SILVER"
                  : "REGULAR";
          await tx.update(customers).set({ tierLevel, updatedAt: new Date() } as any).where(eq(customers.id, sale.customerId));
        }
      }

      await tx.update(sales).set({
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: cancelledBy ?? null,
        cancelledShiftId: cancelledShiftId ?? null,
      } as any).where(eq(sales.id, id));

      const now = new Date();
      await tx.insert(auditLogs).values({
        entityType: "SALE",
        entityId: id,
        action: "SALE_VOIDED",
        actorId: cancelledBy ?? null,
        metadata: JSON.stringify({ saleId: id, invoiceNo: sale.invoiceNo }),
        createdAt: now,
      } as any);
    });
  }

  async createSuspendedSale(cashierId: number, data: CheckoutRequest, note?: string) {
    const payload = JSON.stringify(data);
    const itemCount = data.items.reduce((sum, i) => sum + i.quantity, 0);
    const cleanedNote = note?.trim() ? note.trim().slice(0, 255) : null;

    const [result] = await db.insert(suspendedSales).values({
      cashierId,
      customerId: data.customerId,
      note: cleanedNote,
      payload,
    });

    const id = result.insertId;
    const [row] = await db.select().from(suspendedSales).where(eq(suspendedSales.id, id));
    return { id: row.id, note: row.note ?? null, createdAt: row.createdAt ?? null, itemCount };
  }

  async getSuspendedSales(cashierId: number) {
    const rows = await db
      .select({
        id: suspendedSales.id,
        note: suspendedSales.note,
        payload: suspendedSales.payload,
        createdAt: suspendedSales.createdAt,
      })
      .from(suspendedSales)
      .where(eq(suspendedSales.cashierId, cashierId))
      .orderBy(desc(suspendedSales.createdAt));

    return rows.map((r) => {
      let itemCount = 0;
      try {
        const parsed = JSON.parse(r.payload) as CheckoutRequest;
        if (parsed?.items?.length) itemCount = parsed.items.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
      } catch {
        itemCount = 0;
      }
      return { id: r.id, note: r.note ?? null, createdAt: r.createdAt ?? null, itemCount };
    });
  }

  async recallSuspendedSale(cashierId: number, id: number) {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(suspendedSales)
        .where(and(eq(suspendedSales.id, id), eq(suspendedSales.cashierId, cashierId)));

      if (!row) return undefined;

      const parsed = JSON.parse(row.payload) as CheckoutRequest;
      const productIds = Array.from(new Set((parsed.items ?? []).map((i) => i.productId)));

      const foundProducts = productIds.length
        ? await tx.select().from(products).where(inArray(products.id, productIds))
        : [];
      const byId = new Map(foundProducts.map((p) => [p.id, p]));

      const items = (parsed.items ?? []).map((i) => {
        const product = byId.get(i.productId);
        if (!product) throw new Error(`Product ${i.productId} not found`);
        return { ...product, quantity: i.quantity, unitType: i.unitType ?? "PCS", discount: i.discount };
      });

      let customer: Customer | null = null;
      if (parsed.customerId) {
        const [c] = await tx.select().from(customers).where(eq(customers.id, parsed.customerId));
        customer = c ?? null;
      }

      await tx.delete(suspendedSales).where(and(eq(suspendedSales.id, id), eq(suspendedSales.cashierId, cashierId)));

      return {
        id: row.id,
        note: row.note ?? null,
        createdAt: row.createdAt ?? null,
        customer,
        globalDiscount: Number(parsed.globalDiscount ?? 0),
        pointsToRedeem: Number((parsed as any).pointsToRedeem ?? 0),
        paymentMethod: parsed.paymentMethod ?? "cash",
        items,
      };
    });
  }

  async createReturn(
    saleId: number,
    itemsToReturn: { productId: number; quantity: number }[],
    reason: string,
    refundMethod: string,
    actor: { id: number; role: string },
    shiftId: number,
  ): Promise<Return> {
    return await db.transaction(async (tx) => {
      const approvalThreshold = Number(process.env.REFUND_APPROVAL_THRESHOLD ?? 500000);
      const actorRole = String(actor?.role ?? "");
      const actorId = Number(actor?.id);
      const shiftIdNum = Number(shiftId);
      if (!actorId || !Number.isFinite(actorId)) throw new BusinessError(401, "UNAUTHORIZED", "Tidak terautentikasi");
      if (!actorRole) throw new BusinessError(403, "FORBIDDEN", "Akses ditolak");
      if (!shiftIdNum || !Number.isFinite(shiftIdNum)) throw new BusinessError(409, "NO_ACTIVE_SHIFT", "Shift kasir belum dibuka");

      const [sale] = await tx.select().from(sales).where(eq(sales.id, saleId));
      if (!sale) throw new BusinessError(404, "NOT_FOUND", "Transaksi tidak ditemukan");
      if (sale.status === "CANCELLED") throw new BusinessError(409, "SALE_VOIDED", "Tidak bisa retur: transaksi sudah void");
      if (sale.status === "REFUNDED") throw new BusinessError(409, "SALE_REFUNDED", "Tidak bisa retur: transaksi sudah full refund");
      if (!itemsToReturn?.length) throw new BusinessError(400, "VALIDATION_ERROR", "Item retur kosong");

      const soldItems = await tx.select().from(saleItems).where(eq(saleItems.saleId, saleId));
      if (!soldItems.length) throw new BusinessError(409, "SALE_ITEMS_EMPTY", "Item transaksi tidak ditemukan");

      const soldByProduct = new Map<number, { soldPcs: number; subtotal: number }>();
      for (const r of soldItems) {
        const soldPcs = Number(r.conversionQty ?? 0) > 0 ? Number(r.conversionQty) : Number(r.quantity);
        soldByProduct.set(Number(r.productId), { soldPcs, subtotal: Number(r.subtotal ?? 0) });
      }

      const alreadyReturnedRows = await tx
        .select({
          productId: returnItems.productId,
          returnedQty: sql<number>`COALESCE(SUM(${returnItems.quantity}), 0)`,
        })
        .from(returnItems)
        .innerJoin(returns, eq(returnItems.returnId, returns.id))
        .where(and(eq(returns.saleId, saleId), eq(returns.status, "COMPLETED")))
        .groupBy(returnItems.productId);

      const alreadyReturnedByProduct = new Map<number, number>();
      for (const r of alreadyReturnedRows) {
        alreadyReturnedByProduct.set(Number(r.productId), Number(r.returnedQty ?? 0));
      }

      const prepared: Array<{ productId: number; quantity: number; subtotal: number }> = [];
      let returnedSubtotal = 0;

      for (const item of itemsToReturn) {
        const qty = Math.max(0, Math.floor(Number(item.quantity ?? 0)));
        if (qty <= 0) continue;

        const sold = soldByProduct.get(Number(item.productId));
        if (!sold) throw new BusinessError(400, "VALIDATION_ERROR", `Produk ${item.productId} tidak ada di transaksi`);

        const alreadyReturned = alreadyReturnedByProduct.get(Number(item.productId)) ?? 0;
        const remaining = Math.max(0, sold.soldPcs - alreadyReturned);
        if (qty > remaining) {
          throw new BusinessError(400, "RETURN_QTY_EXCEEDS", "Qty retur melebihi qty beli", {
            productId: item.productId,
            soldQty: sold.soldPcs,
            alreadyReturned,
            requested: qty,
          });
        }

        const unitSubtotal = sold.soldPcs > 0 ? sold.subtotal / sold.soldPcs : 0;
        const lineSubtotal = roundMoney(unitSubtotal * qty);
        returnedSubtotal += lineSubtotal;

        prepared.push({ productId: Number(item.productId), quantity: qty, subtotal: lineSubtotal });
      }

      if (!prepared.length) throw new BusinessError(400, "VALIDATION_ERROR", "Tidak ada item retur valid");

      const saleSubtotal = Number(sale.subtotal ?? 0);
      const ratio = saleSubtotal > 0 ? returnedSubtotal / saleSubtotal : 0;
      const globalDiscountShare = roundMoney(Number((sale as any).globalDiscountAmount ?? 0) * ratio);
      const redeemedAmountShare = roundMoney(Number((sale as any).redeemedAmount ?? 0) * ratio);
      const cashRefund = roundMoney(Math.max(0, returnedSubtotal - globalDiscountShare - redeemedAmountShare));

      if (actorRole === "cashier" && cashRefund > approvalThreshold) {
        throw new BusinessError(403, "SUPERVISOR_REQUIRED", "Refund melebihi limit kasir, butuh approval supervisor", {
          refundAmount: cashRefund,
          threshold: approvalThreshold,
        });
      }

      for (const it of prepared) {
        await tx.update(products)
          .set({ stock: sql`${products.stock} + ${it.quantity}` })
          .where(eq(products.id, it.productId));
      }

      const returnNumber = generateReturnNumber();

      let pointsReversed = 0;
      let pointsRestored = 0;

      if (sale.customerId != null) {
        const customerId = Number(sale.customerId);

        const [alreadyPointAgg] = await tx
          .select({
            restored: sql<string>`COALESCE(SUM(${returns.pointsRestored}), 0)`,
            reversed: sql<string>`COALESCE(SUM(${returns.pointsReversed}), 0)`,
          })
          .from(returns)
          .where(and(eq(returns.saleId, saleId), eq(returns.status, "COMPLETED")));

        const alreadyRestored = Number(alreadyPointAgg?.restored ?? 0);
        const alreadyReversed = Number(alreadyPointAgg?.reversed ?? 0);

        const originalRedeemedPoints = Number((sale as any).redeemedPoints ?? 0);
        const originalRedeemedAmount = Number((sale as any).redeemedAmount ?? 0);
        if (originalRedeemedPoints > 0 && originalRedeemedAmount > 0) {
          const remaining = Math.max(0, originalRedeemedPoints - alreadyRestored);
          const proportional = Math.round(originalRedeemedPoints * (redeemedAmountShare / originalRedeemedAmount));
          pointsRestored = Math.min(remaining, Math.max(0, proportional));
        }

        const originalEarned = Number((sale as any).pointsEarned ?? 0);
        const originalFinal = Number(sale.finalAmount ?? 0);
        if (originalEarned > 0) {
          const remaining = Math.max(0, originalEarned - alreadyReversed);
          const ratioEarn = originalFinal > 0 ? cashRefund / originalFinal : ratio;
          const proportional = Math.floor(originalEarned * ratioEarn);
          pointsReversed = Math.min(remaining, Math.max(0, proportional));
        }

        if (cashRefund > 0) {
          await tx.update(customers)
            .set({ totalSpending: sql`GREATEST(0, ${customers.totalSpending} - ${cashRefund})`, updatedAt: new Date() } as any)
            .where(eq(customers.id, customerId));
        }

        const pointDelta = pointsRestored - pointsReversed;
        if (pointDelta !== 0) {
          await tx.update(customers)
            .set({ totalPoints: sql`${customers.totalPoints} + ${pointDelta}`, updatedAt: new Date() } as any)
            .where(eq(customers.id, customerId));
        }

        if (pointsRestored > 0) {
          await tx.insert(pointLogs).values({
            customerId,
            saleId,
            pointsChange: pointsRestored,
            reason: `Return Restore Redeem: ${returnNumber}`,
          } as any);
        }
        if (pointsReversed > 0) {
          await tx.insert(pointLogs).values({
            customerId,
            saleId,
            pointsChange: -pointsReversed,
            reason: `Return Reverse Earned: ${returnNumber}`,
          } as any);
        }

        const [cfgRow] = await tx.select().from(loyaltySettings).where(eq(loyaltySettings.id, 1)).limit(1);
        const cfg = cfgRow
          ? {
              silverMinSpending: Number(cfgRow.silverMinSpending),
              goldMinSpending: Number(cfgRow.goldMinSpending),
              platinumMinSpending: Number(cfgRow.platinumMinSpending),
            }
          : { silverMinSpending: 1000000, goldMinSpending: 5000000, platinumMinSpending: 10000000 };

        const [updatedCustomer] = await tx
          .select({ totalSpending: customers.totalSpending })
          .from(customers)
          .where(eq(customers.id, customerId))
          .limit(1);
        if (updatedCustomer) {
          const totalSpending = Number(updatedCustomer.totalSpending ?? 0);
          const tierLevel =
            totalSpending >= cfg.platinumMinSpending
              ? "PLATINUM"
              : totalSpending >= cfg.goldMinSpending
                ? "GOLD"
                : totalSpending >= cfg.silverMinSpending
                  ? "SILVER"
                  : "REGULAR";
          await tx.update(customers).set({ tierLevel, updatedAt: new Date() } as any).where(eq(customers.id, customerId));
        }
      }

      const now = new Date();
      const [retResult] = await tx.insert(returns).values({
        saleId,
        shiftId: shiftIdNum,
        returnNumber,
        customerId: sale.customerId ?? null,
        cashierId: actorId,
        totalRefund: String(cashRefund),
        refundMethod,
        pointsReversed,
        pointsRestored,
        reason,
        status: "COMPLETED",
        createdAt: now,
        returnDate: now,
      } as any);
      const retId = Number(retResult.insertId);
      const [ret] = await tx.select().from(returns).where(eq(returns.id, retId));

      let refundAllocated = 0;
      for (let i = 0; i < prepared.length; i++) {
        const it = prepared[i];
        const weight = returnedSubtotal > 0 ? it.subtotal / returnedSubtotal : 0;
        const itemRefund = i === prepared.length - 1 ? roundMoney(cashRefund - refundAllocated) : roundMoney(cashRefund * weight);
        refundAllocated += itemRefund;
        await tx.insert(returnItems).values({
          returnId: retId,
          productId: it.productId,
          quantity: it.quantity,
          subtotal: String(it.subtotal),
          refundAmount: String(Math.max(0, itemRefund)),
        } as any);
      }

      const [returnedSubtotalAgg] = await tx
        .select({
          totalReturnedSubtotal: sql<string>`COALESCE(SUM(${returnItems.subtotal}), 0)`,
        })
        .from(returnItems)
        .innerJoin(returns, eq(returnItems.returnId, returns.id))
        .where(and(eq(returns.saleId, saleId), eq(returns.status, "COMPLETED")));

      const totalReturnedSubtotal = Number(returnedSubtotalAgg?.totalReturnedSubtotal ?? 0);
      const epsilon = 0.01;
      const nextStatus = totalReturnedSubtotal >= saleSubtotal - epsilon ? "REFUNDED" : totalReturnedSubtotal > 0 ? "PARTIAL_REFUND" : "COMPLETED";
      if (sale.status !== nextStatus) {
        await tx.update(sales).set({ status: nextStatus } as any).where(eq(sales.id, saleId));
      }

      await tx.insert(auditLogs).values({
        entityType: "SALE",
        entityId: saleId,
        action: "RETURN_CREATED",
        actorId: actorId,
        metadata: JSON.stringify({
          returnId: retId,
          returnNumber,
          refundMethod,
          returnedSubtotal,
          globalDiscountShare,
          redeemedAmountShare,
          cashRefund,
          pointsRestored,
          pointsReversed,
          reason,
          items: prepared,
        }),
        createdAt: now,
      } as any);
      await tx.insert(auditLogs).values({
        entityType: "RETURN",
        entityId: retId,
        action: "RETURN_CREATED",
        actorId: actorId,
        metadata: JSON.stringify({ saleId, returnNumber, refundMethod, cashRefund, reason }),
        createdAt: now,
      } as any);

      return ret as any;
    });
  }

  async getReturns(
    params?: { startDate?: string; endDate?: string; status?: string; search?: string; page?: number; pageSize?: number },
    context?: { userId: number; role: string }
  ): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, Number(params?.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(params?.pageSize ?? 20)));
    const offset = (page - 1) * pageSize;

    const conditions: any[] = [];
    const role = String(context?.role ?? "");
    const userId = context?.userId != null ? Number(context.userId) : null;
    const isManager = role === "admin" || role === "supervisor";
    if (!isManager && userId != null) {
      conditions.push(eq(returns.cashierId, userId));
    }
    if (params?.startDate) {
      const d = new Date(params.startDate);
      if (!Number.isNaN(d.getTime())) conditions.push(sql`${returns.createdAt} >= ${d.toISOString()}`);
    }
    if (params?.endDate) {
      const d = new Date(params.endDate);
      if (!Number.isNaN(d.getTime())) conditions.push(sql`${returns.createdAt} <= ${d.toISOString()}`);
    }
    if (params?.status) conditions.push(eq(returns.status, String(params.status)));
    const search = params?.search?.trim();
    if (search) {
      const like = `%${search}%`;
      conditions.push(sql`(
        ${returns.returnNumber} LIKE ${like}
        OR ${sales.invoiceNo} LIKE ${like}
        OR ${returns.reason} LIKE ${like}
      )`);
    }
    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [countRow] = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(returns)
      .innerJoin(sales, eq(returns.saleId, sales.id))
      .where(whereClause as any);
    const total = Number(countRow?.count ?? 0);

    let query = db.select({
      ret: returns,
      sale: sales,
    })
    .from(returns)
    .innerJoin(sales, eq(returns.saleId, sales.id)) as any;
    if (whereClause) query = query.where(whereClause);
    query = query.orderBy(desc(returns.createdAt), desc(returns.id)).limit(pageSize).offset(offset);
    const rows = await query;

    const returnIds = rows.map((r: any) => Number(r.ret.id));
    const itemsData = returnIds.length
      ? await db.select({
          id: returnItems.id,
          returnId: returnItems.returnId,
          productId: returnItems.productId,
          quantity: returnItems.quantity,
          subtotal: (returnItems as any).subtotal,
          refundAmount: returnItems.refundAmount,
          product: products,
        })
        .from(returnItems)
        .innerJoin(products, eq(returnItems.productId, products.id))
        .where(inArray(returnItems.returnId, returnIds))
      : [];

    const itemsMap = new Map<number, any[]>();
    for (const it of itemsData as any[]) {
      const list = itemsMap.get(Number(it.returnId)) ?? [];
      list.push({
        id: it.id,
        returnId: it.returnId,
        productId: it.productId,
        quantity: Number(it.quantity ?? 0),
        subtotal: Number(it.subtotal ?? 0),
        refundAmount: Number(it.refundAmount ?? 0),
        product: it.product,
      });
      itemsMap.set(Number(it.returnId), list);
    }

    return {
      items: rows.map((r: any) => ({
        ...r.ret,
        totalRefund: Number(r.ret.totalRefund ?? 0),
        pointsReversed: Number(r.ret.pointsReversed ?? 0),
        pointsRestored: Number(r.ret.pointsRestored ?? 0),
        sale: r.sale,
        items: itemsMap.get(Number(r.ret.id)) ?? [],
      })),
      total,
      page,
      pageSize,
    };
  }

  async deleteReturn(id: number, cancelledBy?: number): Promise<void> {
    await db.transaction(async (tx) => {
      const [ret] = await tx.select().from(returns).where(eq(returns.id, id));
      if (!ret) return;
      if (ret.status === "CANCELLED") return;

      const items = await tx.select().from(returnItems).where(eq(returnItems.returnId, id));
      for (const item of items) {
        const qty = Number(item.quantity ?? 0);
        const [stockResult] = await tx.update(products)
          .set({ stock: sql`${products.stock} - ${qty}` })
          .where(and(eq(products.id, item.productId), gte(products.stock, qty)));
        if (!stockResult?.affectedRows) {
          throw new BusinessError(409, "INSUFFICIENT_STOCK", "Stok tidak cukup untuk membatalkan retur", {
            productId: item.productId,
            requiredQty: qty,
          });
        }
      }

      if (ret.customerId != null) {
        const customerId = Number(ret.customerId);
        const totalRefund = Number(ret.totalRefund ?? 0);
        const pointsRestored = Number((ret as any).pointsRestored ?? 0);
        const pointsReversed = Number((ret as any).pointsReversed ?? 0);

        if (totalRefund > 0) {
          await tx.update(customers)
            .set({ totalSpending: sql`${customers.totalSpending} + ${totalRefund}`, updatedAt: new Date() } as any)
            .where(eq(customers.id, customerId));
        }

        const pointDelta = pointsReversed - pointsRestored;
        if (pointDelta !== 0) {
          await tx.update(customers)
            .set({ totalPoints: sql`${customers.totalPoints} + ${pointDelta}`, updatedAt: new Date() } as any)
            .where(eq(customers.id, customerId));
        }

        if (pointsRestored > 0) {
          await tx.insert(pointLogs).values({
            customerId,
            saleId: ret.saleId,
            pointsChange: -pointsRestored,
            reason: `Return Cancel Redeem: ${ret.returnNumber}`,
          } as any);
        }
        if (pointsReversed > 0) {
          await tx.insert(pointLogs).values({
            customerId,
            saleId: ret.saleId,
            pointsChange: pointsReversed,
            reason: `Return Cancel Earned: ${ret.returnNumber}`,
          } as any);
        }

        const [cfgRow] = await tx.select().from(loyaltySettings).where(eq(loyaltySettings.id, 1)).limit(1);
        const cfg = cfgRow
          ? {
              silverMinSpending: Number(cfgRow.silverMinSpending),
              goldMinSpending: Number(cfgRow.goldMinSpending),
              platinumMinSpending: Number(cfgRow.platinumMinSpending),
            }
          : { silverMinSpending: 1000000, goldMinSpending: 5000000, platinumMinSpending: 10000000 };

        const [updatedCustomer] = await tx
          .select({ totalSpending: customers.totalSpending })
          .from(customers)
          .where(eq(customers.id, customerId))
          .limit(1);
        if (updatedCustomer) {
          const totalSpending = Number(updatedCustomer.totalSpending ?? 0);
          const tierLevel =
            totalSpending >= cfg.platinumMinSpending
              ? "PLATINUM"
              : totalSpending >= cfg.goldMinSpending
                ? "GOLD"
                : totalSpending >= cfg.silverMinSpending
                  ? "SILVER"
                  : "REGULAR";
          await tx.update(customers).set({ tierLevel, updatedAt: new Date() } as any).where(eq(customers.id, customerId));
        }
      }

      await tx.update(returns).set({ status: "CANCELLED" } as any).where(eq(returns.id, id));

      const [saleRow] = await tx.select().from(sales).where(eq(sales.id, Number(ret.saleId)));
      if (saleRow) {
        const saleSubtotal = Number(saleRow.subtotal ?? 0);
        const [returnedSubtotalAgg] = await tx
          .select({
            totalReturnedSubtotal: sql<string>`COALESCE(SUM(${returnItems.subtotal}), 0)`,
          })
          .from(returnItems)
          .innerJoin(returns, eq(returnItems.returnId, returns.id))
          .where(and(eq(returns.saleId, Number(ret.saleId)), eq(returns.status, "COMPLETED")));
        const totalReturnedSubtotal = Number(returnedSubtotalAgg?.totalReturnedSubtotal ?? 0);
        const epsilon = 0.01;
        const nextStatus = totalReturnedSubtotal >= saleSubtotal - epsilon ? "REFUNDED" : totalReturnedSubtotal > 0 ? "PARTIAL_REFUND" : "COMPLETED";
        await tx.update(sales).set({ status: nextStatus } as any).where(eq(sales.id, Number(ret.saleId)));
      }

      const now = new Date();
      await tx.insert(auditLogs).values({
        entityType: "RETURN",
        entityId: id,
        action: "RETURN_CANCELLED",
        actorId: cancelledBy ?? null,
        metadata: JSON.stringify({ saleId: ret.saleId, returnNumber: ret.returnNumber }),
        createdAt: now,
      } as any);
      await tx.insert(auditLogs).values({
        entityType: "SALE",
        entityId: Number(ret.saleId),
        action: "RETURN_CANCELLED",
        actorId: cancelledBy ?? null,
        metadata: JSON.stringify({ returnId: id, returnNumber: ret.returnNumber }),
        createdAt: now,
      } as any);
    });
  }

  async getItemSales(startDate?: Date, endDate?: Date, brandId?: number) {
    const conditions: any[] = [];
    if (startDate && !Number.isNaN(startDate.getTime())) conditions.push(sql`${sales.transactionDate} >= ${startDate.toISOString()}`);
    if (endDate && !Number.isNaN(endDate.getTime())) conditions.push(sql`${sales.transactionDate} <= ${endDate.toISOString()}`);
    if (brandId) conditions.push(eq(products.brandId, brandId));

    let query = db.select({
      productName: products.name,
      brandName: brands.name,
      quantitySold: sql<number>`sum(case when ${saleItems.conversionQty} > 0 then ${saleItems.conversionQty} else ${saleItems.quantity} end)`,
      totalRevenue: sql<number>`sum(${saleItems.subtotal})`
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .innerJoin(products, eq(saleItems.productId, products.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .groupBy(products.name, brands.name);

    if (conditions.length > 0) {
      // @ts-ignore
      query = query.where(and(...conditions));
    }

    // @ts-ignore
    const result = await query;
    return result.map(r => ({
      ...r,
      quantitySold: Number(r.quantitySold),
      totalRevenue: Number(r.totalRevenue)
    }));
  }

  async getReportSummary(params?: { startDate?: string; endDate?: string; brandId?: number }) {
    const salesConditions: any[] = [sql`${sales.status} <> 'CANCELLED'`];
    const returnConditions: any[] = [eq(returns.status, "COMPLETED")];

    if (params?.startDate) {
      const d = new Date(params.startDate);
      if (!Number.isNaN(d.getTime())) {
        salesConditions.push(sql`${sales.transactionDate} >= ${d.toISOString()}`);
        returnConditions.push(sql`${returns.createdAt} >= ${d.toISOString()}`);
      }
    }
    if (params?.endDate) {
      const d = new Date(params.endDate);
      if (!Number.isNaN(d.getTime())) {
        salesConditions.push(sql`${sales.transactionDate} <= ${d.toISOString()}`);
        returnConditions.push(sql`${returns.createdAt} <= ${d.toISOString()}`);
      }
    }

    if (params?.brandId) {
      salesConditions.push(eq(products.brandId, params.brandId));
      returnConditions.push(eq(products.brandId, params.brandId));

      const [salesAgg] = await db
        .select({
          totalSales: sql<string>`COALESCE(SUM(${saleItems.subtotal}), 0)`,
          totalTransactions: sql<string>`COUNT(DISTINCT ${sales.id})`,
        })
        .from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .innerJoin(products, eq(saleItems.productId, products.id))
        .where(and(...salesConditions) as any);

      const [refundAgg] = await db
        .select({
          totalRefund: sql<string>`COALESCE(SUM(${returnItems.refundAmount}), 0)`,
        })
        .from(returnItems)
        .innerJoin(returns, eq(returnItems.returnId, returns.id))
        .innerJoin(products, eq(returnItems.productId, products.id))
        .where(and(...returnConditions) as any);

      const totalSales = Number(salesAgg?.totalSales ?? 0);
      const totalRefund = Number(refundAgg?.totalRefund ?? 0);
      const totalTransactions = Number(salesAgg?.totalTransactions ?? 0);

      return {
        totalSales,
        totalRefund,
        netRevenue: roundMoney(totalSales - totalRefund),
        totalDiscount: 0,
        totalPointUsed: 0,
        totalPointIssued: 0,
        totalTransactions,
        averageTransactionValue: totalTransactions > 0 ? roundMoney(totalSales / totalTransactions) : 0,
      };
    } else {
      const [salesAgg] = await db
        .select({
          totalSales: sql<string>`COALESCE(SUM(${sales.finalAmount}), 0)`,
          totalDiscount: sql<string>`COALESCE(SUM(${sales.discountAmount}), 0)`,
          totalPointUsed: sql<string>`COALESCE(SUM(${sales.redeemedPoints}), 0)`,
          totalPointIssued: sql<string>`COALESCE(SUM(${sales.pointsEarned}), 0)`,
          totalTransactions: sql<string>`COUNT(*)`,
        })
        .from(sales)
        .where(and(...salesConditions) as any);

      const [refundAgg] = await db
        .select({
          totalRefund: sql<string>`COALESCE(SUM(${returns.totalRefund}), 0)`,
        })
        .from(returns)
        .where(and(...returnConditions) as any);

      const totalSales = Number(salesAgg?.totalSales ?? 0);
      const totalRefund = Number(refundAgg?.totalRefund ?? 0);
      const totalTransactions = Number(salesAgg?.totalTransactions ?? 0);

      return {
        totalSales,
        totalRefund,
        netRevenue: roundMoney(totalSales - totalRefund),
        totalDiscount: Number(salesAgg?.totalDiscount ?? 0),
        totalPointUsed: Number(salesAgg?.totalPointUsed ?? 0),
        totalPointIssued: Number(salesAgg?.totalPointIssued ?? 0),
        totalTransactions,
        averageTransactionValue: totalTransactions > 0 ? roundMoney(totalSales / totalTransactions) : 0,
      };
    }
  }

  async getReportSales(params?: { startDate?: string; endDate?: string; groupBy?: "day" | "week" | "month"; cashierId?: number; paymentMethod?: string; tier?: string; brandId?: number }) {
    const groupBy = params?.groupBy ?? "day";
    const bucketExpr =
      groupBy === "month"
        ? sql<string>`DATE_FORMAT(${sales.transactionDate}, '%Y-%m')`
        : groupBy === "week"
          ? sql<string>`CONCAT(YEAR(${sales.transactionDate}), '-', LPAD(WEEK(${sales.transactionDate}, 1), 2, '0'))`
          : sql<string>`DATE(${sales.transactionDate})`;

    const salesConditions: any[] = [sql`${sales.status} <> 'CANCELLED'`];
    if (params?.cashierId != null) salesConditions.push(eq(sales.cashierId, Number(params.cashierId)));
    if (params?.paymentMethod) salesConditions.push(eq(sales.paymentMethod, String(params.paymentMethod)));
    if (params?.tier) salesConditions.push(eq(customers.tierLevel, String(params.tier)));
    if (params?.startDate) {
      const d = new Date(params.startDate);
      if (!Number.isNaN(d.getTime())) salesConditions.push(sql`${sales.transactionDate} >= ${d.toISOString()}`);
    }
    if (params?.endDate) {
      const d = new Date(params.endDate);
      if (!Number.isNaN(d.getTime())) salesConditions.push(sql`${sales.transactionDate} <= ${d.toISOString()}`);
    }

    const refundConditions: any[] = [eq(returns.status, "COMPLETED")];
    if (params?.cashierId != null) refundConditions.push(eq(sales.cashierId, Number(params.cashierId)));
    if (params?.paymentMethod) refundConditions.push(eq(sales.paymentMethod, String(params.paymentMethod)));
    if (params?.tier) refundConditions.push(eq(customers.tierLevel, String(params.tier)));
    if (params?.startDate) {
      const d = new Date(params.startDate);
      if (!Number.isNaN(d.getTime())) refundConditions.push(sql`${returns.createdAt} >= ${d.toISOString()}`);
    }
    if (params?.endDate) {
      const d = new Date(params.endDate);
      if (!Number.isNaN(d.getTime())) refundConditions.push(sql`${returns.createdAt} <= ${d.toISOString()}`);
    }

    if (params?.brandId) {
      salesConditions.push(eq(products.brandId, params.brandId));
      refundConditions.push(eq(products.brandId, params.brandId));

      const salesRows = await db
        .select({
          bucket: bucketExpr,
          totalSales: sql<string>`COALESCE(SUM(${saleItems.subtotal}), 0)`,
          transactions: sql<number>`COUNT(DISTINCT ${sales.id})`,
        })
        .from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .innerJoin(products, eq(saleItems.productId, products.id))
        .leftJoin(customers, eq(sales.customerId, customers.id))
        .where(and(...salesConditions) as any)
        .groupBy(bucketExpr)
        .orderBy(bucketExpr);

      const refundRows = await db
        .select({
          bucket: bucketExpr,
          totalRefund: sql<string>`COALESCE(SUM(${returnItems.refundAmount}), 0)`,
        })
        .from(returnItems)
        .innerJoin(returns, eq(returnItems.returnId, returns.id))
        .innerJoin(sales, eq(returns.saleId, sales.id))
        .innerJoin(products, eq(returnItems.productId, products.id))
        .leftJoin(customers, eq(sales.customerId, customers.id))
        .where(and(...refundConditions) as any)
        .groupBy(bucketExpr)
        .orderBy(bucketExpr);

      const refundByBucket = new Map<string, number>();
      refundRows.forEach(r => refundByBucket.set(String(r.bucket ?? ""), Number(r.totalRefund ?? 0)));

      return salesRows.map(r => {
        const bucket = String(r.bucket ?? "");
        const totalSales = Number(r.totalSales ?? 0);
        const totalRefund = refundByBucket.get(bucket) ?? 0;
        return {
          bucket,
          totalSales,
          totalRefund,
          netRevenue: roundMoney(totalSales - totalRefund),
          transactions: Number(r.transactions ?? 0),
        };
      });
    } else {
      const salesRows = await db
        .select({
          bucket: bucketExpr,
          totalSales: sql<string>`COALESCE(SUM(${sales.finalAmount}), 0)`,
          transactions: sql<number>`COUNT(*)`,
        })
        .from(sales)
        .leftJoin(customers, eq(sales.customerId, customers.id))
        .where(and(...salesConditions) as any)
        .groupBy(bucketExpr)
        .orderBy(bucketExpr);

      const refundRows = await db
        .select({
          bucket: bucketExpr,
          totalRefund: sql<string>`COALESCE(SUM(${returns.totalRefund}), 0)`,
        })
        .from(returns)
        .leftJoin(sales, eq(returns.saleId, sales.id))
        .leftJoin(customers, eq(sales.customerId, customers.id))
        .where(and(...refundConditions) as any)
        .groupBy(bucketExpr)
        .orderBy(bucketExpr);

      const refundByBucket = new Map<string, number>();
      refundRows.forEach(r => refundByBucket.set(String(r.bucket ?? ""), Number(r.totalRefund ?? 0)));

      return salesRows.map(r => {
        const bucket = String(r.bucket ?? "");
        const totalSales = Number(r.totalSales ?? 0);
        const totalRefund = refundByBucket.get(bucket) ?? 0;
        return {
          bucket,
          totalSales,
          totalRefund,
          netRevenue: roundMoney(totalSales - totalRefund),
          transactions: Number(r.transactions ?? 0),
        };
      });
    }
  }

  async getReportCustomers(params?: { startDate?: string; endDate?: string; limit?: number; brandId?: number }) {
    const limit = Math.min(100, Math.max(1, Number(params?.limit ?? 10)));
    const salesConditions: any[] = [sql`${sales.status} <> 'CANCELLED'`, sql`${sales.customerId} IS NOT NULL`];
    if (params?.startDate) {
      const d = new Date(params.startDate);
      if (!Number.isNaN(d.getTime())) salesConditions.push(sql`${sales.transactionDate} >= ${d.toISOString()}`);
    }
    if (params?.endDate) {
      const d = new Date(params.endDate);
      if (!Number.isNaN(d.getTime())) salesConditions.push(sql`${sales.transactionDate} <= ${d.toISOString()}`);
    }

    const refundConditions: any[] = [eq(returns.status, "COMPLETED")];
    if (params?.startDate) {
      const d = new Date(params.startDate);
      if (!Number.isNaN(d.getTime())) refundConditions.push(sql`${returns.createdAt} >= ${d.toISOString()}`);
    }
    if (params?.endDate) {
      const d = new Date(params.endDate);
      if (!Number.isNaN(d.getTime())) refundConditions.push(sql`${returns.createdAt} <= ${d.toISOString()}`);
    }

    if (params?.brandId) {
      salesConditions.push(eq(products.brandId, params.brandId));
      refundConditions.push(eq(products.brandId, params.brandId));

      const base = await db
        .select({
          customerId: customers.id,
          name: customers.name,
          phone: customers.phone,
          tier: customers.tierLevel,
          totalSales: sql<string>`COALESCE(SUM(${saleItems.subtotal}), 0)`,
          transactions: sql<number>`COUNT(DISTINCT ${sales.id})`,
        })
        .from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .innerJoin(products, eq(saleItems.productId, products.id))
        .innerJoin(customers, eq(sales.customerId, customers.id))
        .where(and(...salesConditions) as any)
        .groupBy(customers.id, customers.name, customers.phone, customers.tierLevel)
        .orderBy(desc(sql`COALESCE(SUM(${saleItems.subtotal}), 0)`))
        .limit(limit);

      const refunds = await db
        .select({
          customerId: sales.customerId,
          totalRefund: sql<string>`COALESCE(SUM(${returnItems.refundAmount}), 0)`,
        })
        .from(returnItems)
        .innerJoin(returns, eq(returnItems.returnId, returns.id))
        .leftJoin(sales, eq(returns.saleId, sales.id))
        .innerJoin(products, eq(returnItems.productId, products.id))
        .where(and(...refundConditions) as any)
        .groupBy(sales.customerId);

      const refundByCustomer = new Map<number, number>();
      refunds.forEach(r => refundByCustomer.set(Number(r.customerId), Number(r.totalRefund ?? 0)));

      // Note: totalPointOutstanding is global, not per brand
      const [pointsAgg] = await db.select({ total: sql<string>`COALESCE(SUM(${customers.totalPoints}), 0)` }).from(customers).where(eq(customers.status, "ACTIVE"));

      return {
        topSpenders: base.map(r => {
          const customerId = Number(r.customerId);
          const totalSales = Number(r.totalSales ?? 0);
          const totalRefund = refundByCustomer.get(customerId) ?? 0;
          return {
            customerId,
            name: String(r.name ?? ""),
            phone: r.phone ?? null,
            tier: String(r.tier ?? "REGULAR"),
            totalSpent: roundMoney(totalSales - totalRefund),
            transactions: Number(r.transactions ?? 0),
          };
        }),
        totalPointOutstanding: Number(pointsAgg?.total ?? 0),
      };
    } else {
      const base = await db
        .select({
          customerId: customers.id,
          name: customers.name,
          phone: customers.phone,
          tier: customers.tierLevel,
          totalSales: sql<string>`COALESCE(SUM(${sales.finalAmount}), 0)`,
          transactions: sql<number>`COUNT(*)`,
        })
        .from(sales)
        .innerJoin(customers, eq(sales.customerId, customers.id))
        .where(and(...salesConditions) as any)
        .groupBy(customers.id, customers.name, customers.phone, customers.tierLevel)
        .orderBy(desc(sql`COALESCE(SUM(${sales.finalAmount}), 0)`))
        .limit(limit);

      const refunds = await db
        .select({
          customerId: sales.customerId,
          totalRefund: sql<string>`COALESCE(SUM(${returns.totalRefund}), 0)`,
        })
        .from(returns)
        .leftJoin(sales, eq(returns.saleId, sales.id))
        .where(and(...refundConditions) as any)
        .groupBy(sales.customerId);

      const refundByCustomer = new Map<number, number>();
      refunds.forEach(r => refundByCustomer.set(Number(r.customerId), Number(r.totalRefund ?? 0)));

      const [pointsAgg] = await db.select({ total: sql<string>`COALESCE(SUM(${customers.totalPoints}), 0)` }).from(customers).where(eq(customers.status, "ACTIVE"));

      return {
        topSpenders: base.map(r => {
          const customerId = Number(r.customerId);
          const totalSales = Number(r.totalSales ?? 0);
          const totalRefund = refundByCustomer.get(customerId) ?? 0;
          return {
            customerId,
            name: String(r.name ?? ""),
            phone: r.phone ?? null,
            tier: String(r.tier ?? "REGULAR"),
            totalSpent: roundMoney(totalSales - totalRefund),
            transactions: Number(r.transactions ?? 0),
          };
        }),
        totalPointOutstanding: Number(pointsAgg?.total ?? 0),
      };
    }
  }

  async getReportProducts(params?: { startDate?: string; endDate?: string; limit?: number; brandId?: number }) {
    const limit = Math.min(100, Math.max(1, Number(params?.limit ?? 10)));
    const salesConditions: any[] = [sql`${sales.status} <> 'CANCELLED'`];
    if (params?.startDate) {
      const d = new Date(params.startDate);
      if (!Number.isNaN(d.getTime())) salesConditions.push(sql`${sales.transactionDate} >= ${d.toISOString()}`);
    }
    if (params?.endDate) {
      const d = new Date(params.endDate);
      if (!Number.isNaN(d.getTime())) salesConditions.push(sql`${sales.transactionDate} <= ${d.toISOString()}`);
    }
    if (params?.brandId) {
      salesConditions.push(eq(products.brandId, params.brandId));
    }

    const qtyPcs = sql<number>`CASE WHEN ${saleItems.conversionQty} > 0 THEN ${saleItems.conversionQty} ELSE ${saleItems.quantity} END`;

    const bestSelling = await db
      .select({
        productId: products.id,
        productName: products.name,
        quantitySold: sql<number>`COALESCE(SUM(${qtyPcs}), 0)`,
        totalRevenue: sql<string>`COALESCE(SUM(${saleItems.subtotal}), 0)`,
        margin: sql<string>`COALESCE(SUM(${saleItems.subtotal}) - SUM(COALESCE(${products.costPrice}, 0) * ${qtyPcs}), 0)`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(and(...salesConditions) as any)
      .groupBy(products.id, products.name)
      .orderBy(desc(sql`COALESCE(SUM(${saleItems.subtotal}), 0)`))
      .limit(limit);

    const returnConditions: any[] = [eq(returns.status, "COMPLETED")];
    if (params?.startDate) {
      const d = new Date(params.startDate);
      if (!Number.isNaN(d.getTime())) returnConditions.push(sql`${returns.createdAt} >= ${d.toISOString()}`);
    }
    if (params?.endDate) {
      const d = new Date(params.endDate);
      if (!Number.isNaN(d.getTime())) returnConditions.push(sql`${returns.createdAt} <= ${d.toISOString()}`);
    }
    if (params?.brandId) {
      returnConditions.push(eq(products.brandId, params.brandId));
    }

    const mostReturned = await db
      .select({
        productId: products.id,
        productName: products.name,
        quantityReturned: sql<number>`COALESCE(SUM(${returnItems.quantity}), 0)`,
        totalRefund: sql<string>`COALESCE(SUM(${returnItems.refundAmount}), 0)`,
      })
      .from(returnItems)
      .innerJoin(returns, eq(returnItems.returnId, returns.id))
      .innerJoin(products, eq(returnItems.productId, products.id))
      .where(and(...returnConditions) as any)
      .groupBy(products.id, products.name)
      .orderBy(desc(sql`COALESCE(SUM(${returnItems.quantity}), 0)`))
      .limit(limit);

    return {
      bestSelling: bestSelling.map(r => ({
        productId: Number(r.productId),
        productName: String(r.productName ?? ""),
        quantitySold: Number(r.quantitySold ?? 0),
        totalRevenue: Number(r.totalRevenue ?? 0),
        margin: Number(r.margin ?? 0),
      })),
      mostReturned: mostReturned.map(r => ({
        productId: Number(r.productId),
        productName: String(r.productName ?? ""),
        quantityReturned: Number(r.quantityReturned ?? 0),
        totalRefund: Number(r.totalRefund ?? 0),
      })),
    };
  }

  async getReportReturns(params?: { startDate?: string; endDate?: string; brandId?: number }) {
    const returnConditions: any[] = [eq(returns.status, "COMPLETED")];
    if (params?.startDate) {
      const d = new Date(params.startDate);
      if (!Number.isNaN(d.getTime())) returnConditions.push(sql`${returns.createdAt} >= ${d.toISOString()}`);
    }
    if (params?.endDate) {
      const d = new Date(params.endDate);
      if (!Number.isNaN(d.getTime())) returnConditions.push(sql`${returns.createdAt} <= ${d.toISOString()}`);
    }
    if (params?.brandId) {
      returnConditions.push(eq(products.brandId, params.brandId));
    }

    // If brandId is present, we must join products and sum item refunds
    let totalReturns = 0;
    let totalRefund = 0;

    if (params?.brandId) {
       const [agg] = await db
        .select({
           totalReturns: sql<string>`COUNT(DISTINCT ${returns.id})`, // Count returns that contain this brand
           totalRefund: sql<string>`COALESCE(SUM(${returnItems.refundAmount}), 0)` // Sum only items of this brand
        })
        .from(returnItems)
        .innerJoin(returns, eq(returnItems.returnId, returns.id))
        .innerJoin(products, eq(returnItems.productId, products.id))
        .where(and(...returnConditions) as any);
       
       totalReturns = Number(agg?.totalReturns ?? 0);
       totalRefund = Number(agg?.totalRefund ?? 0);
    } else {
       const [agg] = await db.select({
         totalReturns: sql<string>`COUNT(*)`,
         totalRefund: sql<string>`COALESCE(SUM(${returns.totalRefund}), 0)`,
       }).from(returns).where(and(...returnConditions) as any);
       totalReturns = Number(agg?.totalReturns ?? 0);
       totalRefund = Number(agg?.totalRefund ?? 0);
    }

    const salesConditions: any[] = [sql`${sales.status} <> 'CANCELLED'`];
    if (params?.startDate) {
      const d = new Date(params.startDate);
      if (!Number.isNaN(d.getTime())) salesConditions.push(sql`${sales.transactionDate} >= ${d.toISOString()}`);
    }
    if (params?.endDate) {
      const d = new Date(params.endDate);
      if (!Number.isNaN(d.getTime())) salesConditions.push(sql`${sales.transactionDate} <= ${d.toISOString()}`);
    }
    if (params?.brandId) {
       salesConditions.push(eq(products.brandId, params.brandId));
    }

    // Calculate total sales subtotal for ratio
    let totalSalesSubtotal = 0;
    if (params?.brandId) {
       const [agg] = await db.select({
          total: sql<string>`COALESCE(SUM(${saleItems.subtotal}), 0)`
       })
       .from(saleItems)
       .innerJoin(sales, eq(saleItems.saleId, sales.id))
       .innerJoin(products, eq(saleItems.productId, products.id))
       .where(and(...salesConditions) as any);
       totalSalesSubtotal = Number(agg?.total ?? 0);
    } else {
       const [agg] = await db.select({
         total: sql<string>`COALESCE(SUM(${sales.subtotal}), 0)`,
       }).from(sales).where(and(...salesConditions) as any);
       totalSalesSubtotal = Number(agg?.total ?? 0);
    }
    
    // Top Return Items (already uses join in getReportProducts but here we need just the list if needed? 
    // Wait, getReportReturns usually returns summary stats and maybe a list? 
    // The interface in Reports.tsx uses topReturnItems from this call? 
    // Let's check the previous read of storage.ts...
    // Ah, getReportReturns in storage.ts line 2961 returned { totalReturns, totalRefund, returnRatePct, topReturnItems }.
    // I need to make sure I include topReturnItems.

    const [returnedSubtotalAgg] = await db
      .select({
        returnedSubtotal: sql<string>`COALESCE(SUM(${returnItems.subtotal}), 0)`,
      })
      .from(returnItems)
      .innerJoin(returns, eq(returnItems.returnId, returns.id))
      .innerJoin(products, eq(returnItems.productId, products.id)) // Always join products for brand filter safety
      .where(and(...returnConditions) as any);

    const returnedSubtotal = Number(returnedSubtotalAgg?.returnedSubtotal ?? 0);
    const returnRatePct = totalSalesSubtotal > 0 ? ((returnedSubtotal / totalSalesSubtotal) * 100).toFixed(2) : "0.00";

    const topReturnItems = await db
      .select({
        productId: products.id,
        productName: products.name,
        quantityReturned: sql<number>`COALESCE(SUM(${returnItems.quantity}), 0)`,
        totalRefund: sql<string>`COALESCE(SUM(${returnItems.refundAmount}), 0)`,
      })
      .from(returnItems)
      .innerJoin(returns, eq(returnItems.returnId, returns.id))
      .innerJoin(products, eq(returnItems.productId, products.id))
      .where(and(...returnConditions) as any)
      .groupBy(products.id, products.name)
      .orderBy(desc(sql`COALESCE(SUM(${returnItems.quantity}), 0)`))
      .limit(10);

    return {
      totalReturns,
      totalRefund,
      returnRatePct,
      topReturnItems: topReturnItems.map(r => ({
        productId: Number(r.productId),
        productName: String(r.productName ?? ""),
        quantityReturned: Number(r.quantityReturned ?? 0),
        totalRefund: Number(r.totalRefund ?? 0),
      })),
    };
  }

  async getDiscounts(params?: {
    active?: boolean;
    search?: string;
    status?: "ACTIVE" | "INACTIVE";
    appliesTo?: "product" | "category" | "global" | "customer";
    page?: number;
    pageSize?: number;
    sortBy?: "createdAt" | "name" | "priorityLevel" | "startDate" | "endDate";
    sortDir?: "asc" | "desc";
  }): Promise<{ items: Discount[]; page: number; pageSize: number; total: number }> {
    const page = Math.max(1, Number(params?.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(params?.pageSize ?? 20)));
    const offset = (page - 1) * pageSize;

    const conditions: any[] = [];
    if (params?.active === true) {
      const now = new Date();
      conditions.push(eq(discounts.active, true));
      conditions.push(eq(discounts.status, "ACTIVE"));
      conditions.push(sql`(${discounts.startDate} IS NULL OR ${discounts.startDate} <= ${now})`);
      conditions.push(sql`(${discounts.endDate} IS NULL OR ${discounts.endDate} >= ${now})`);
    }
    if (params?.status) conditions.push(eq(discounts.status, params.status));
    if (params?.appliesTo) conditions.push(eq(discounts.appliesTo, params.appliesTo));
    if (params?.search?.trim()) {
      const s = params.search.trim();
      conditions.push(sql`${discounts.name} LIKE ${`%${s}%`}`);
    }
    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [countRow] = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(discounts)
      .where(whereClause as any);
    const total = Number(countRow?.count ?? 0);

    const dirFn = params?.sortDir === "asc" ? asc : desc;
    const sortBy = params?.sortBy ?? "createdAt";
    const sortCol =
      sortBy === "name"
        ? discounts.name
        : sortBy === "priorityLevel"
          ? discounts.priorityLevel
          : sortBy === "startDate"
            ? discounts.startDate
            : sortBy === "endDate"
              ? discounts.endDate
              : discounts.createdAt;

    let query = db.select().from(discounts) as any;
    if (whereClause) query = query.where(whereClause);
    query = query.orderBy(dirFn(sortCol)).limit(pageSize).offset(offset);
    const items = await query;

    return { items, page, pageSize, total };
  }

  async getActiveDiscounts(): Promise<Discount[]> {
    const now = new Date();
    return await db.select().from(discounts).where(
      and(
        eq(discounts.active, true),
        sql`(${discounts.startDate} IS NULL OR ${discounts.startDate} <= ${now})`,
        sql`(${discounts.endDate} IS NULL OR ${discounts.endDate} >= ${now})`
      )
    );
  }

  async getDiscount(id: number): Promise<Discount | undefined> {
    const [discount] = await db.select().from(discounts).where(eq(discounts.id, id));
    return discount;
  }

  async createDiscount(discount: Partial<Discount>): Promise<Discount> {
    const [result] = await db.insert(discounts).values(discount as any);
    const id = result.insertId;
    const [newDiscount] = await db.select().from(discounts).where(eq(discounts.id, id));
    return newDiscount;
  }

  async updateDiscount(id: number, discount: Partial<Discount>): Promise<Discount | undefined> {
    await db.update(discounts).set({ ...discount, updatedAt: new Date() } as any).where(eq(discounts.id, id));
    const [updated] = await db.select().from(discounts).where(eq(discounts.id, id));
    return updated;
  }

  async deleteDiscount(id: number): Promise<void> {
    await db.delete(discounts).where(eq(discounts.id, id));
  }

  async getLoyaltySettings(): Promise<{
    earnAmountPerPoint: number;
    redeemAmountPerPoint: number;
    silverMinSpending: number;
    goldMinSpending: number;
    platinumMinSpending: number;
    silverPointMultiplier: number;
    goldPointMultiplier: number;
    platinumPointMultiplier: number;
  }> {
    const [row] = await db.select().from(loyaltySettings).where(eq(loyaltySettings.id, 1)).limit(1);
    if (!row) {
      const [inserted] = await db.insert(loyaltySettings).values({} as any);
      const id = inserted.insertId ?? 1;
      const [created] = await db.select().from(loyaltySettings).where(eq(loyaltySettings.id, Number(id))).limit(1);
      if (!created) throw new Error("Failed to initialize loyalty settings");
      return {
        earnAmountPerPoint: Number(created.earnAmountPerPoint),
        redeemAmountPerPoint: Number(created.redeemAmountPerPoint),
        silverMinSpending: Number(created.silverMinSpending),
        goldMinSpending: Number(created.goldMinSpending),
        platinumMinSpending: Number(created.platinumMinSpending),
        silverPointMultiplier: Number(created.silverPointMultiplier),
        goldPointMultiplier: Number(created.goldPointMultiplier),
        platinumPointMultiplier: Number(created.platinumPointMultiplier),
      };
    }
    return {
      earnAmountPerPoint: Number(row.earnAmountPerPoint),
      redeemAmountPerPoint: Number(row.redeemAmountPerPoint),
      silverMinSpending: Number(row.silverMinSpending),
      goldMinSpending: Number(row.goldMinSpending),
      platinumMinSpending: Number(row.platinumMinSpending),
      silverPointMultiplier: Number(row.silverPointMultiplier),
      goldPointMultiplier: Number(row.goldPointMultiplier),
      platinumPointMultiplier: Number(row.platinumPointMultiplier),
    };
  }

  async updateLoyaltySettings(input: {
    earnAmountPerPoint: number;
    redeemAmountPerPoint: number;
    silverMinSpending: number;
    goldMinSpending: number;
    platinumMinSpending: number;
    silverPointMultiplier: number;
    goldPointMultiplier: number;
    platinumPointMultiplier: number;
  }): Promise<{
    earnAmountPerPoint: number;
    redeemAmountPerPoint: number;
    silverMinSpending: number;
    goldMinSpending: number;
    platinumMinSpending: number;
    silverPointMultiplier: number;
    goldPointMultiplier: number;
    platinumPointMultiplier: number;
  }> {
    await db.update(loyaltySettings).set({ ...input, updatedAt: new Date() } as any).where(eq(loyaltySettings.id, 1));
    return await this.getLoyaltySettings();
  }

  async getAppSettings(): Promise<{ storeName: string; storeAddress: string | null; receiptFooter: string | null }> {
    const [row] = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
    if (!row) {
      const [inserted] = await db.insert(appSettings).values({} as any);
      const id = inserted.insertId ?? 1;
      const [created] = await db.select().from(appSettings).where(eq(appSettings.id, Number(id))).limit(1);
      if (!created) throw new Error("Failed to initialize app settings");
      return {
        storeName: String(created.storeName ?? "Barokah Frozen Food"),
        storeAddress: created.storeAddress ?? null,
        receiptFooter: created.receiptFooter ?? null,
      };
    }
    return {
      storeName: String(row.storeName ?? "Barokah Frozen Food"),
      storeAddress: row.storeAddress ?? null,
      receiptFooter: row.receiptFooter ?? null,
    };
  }

  async updateAppSettings(input: {
    storeName: string;
    storeAddress?: string | null;
    receiptFooter?: string | null;
  }): Promise<{ storeName: string; storeAddress: string | null; receiptFooter: string | null }> {
    const [existing] = await db.select({ id: appSettings.id }).from(appSettings).where(eq(appSettings.id, 1)).limit(1);
    if (!existing) {
      await db.insert(appSettings).values({
        id: 1,
        storeName: input.storeName,
        storeAddress: input.storeAddress ?? null,
        receiptFooter: input.receiptFooter ?? null,
        updatedAt: new Date(),
      } as any);
      return await this.getAppSettings();
    }

    await db.update(appSettings).set({
      storeName: input.storeName,
      storeAddress: input.storeAddress ?? null,
      receiptFooter: input.receiptFooter ?? null,
      updatedAt: new Date(),
    } as any).where(eq(appSettings.id, 1));
    return await this.getAppSettings();
  }

  async getDashboardOverview(params?: { days?: number; months?: number; topLimit?: number; lowStockThreshold?: number }) {
    const days = Math.min(365, Math.max(1, Math.floor(params?.days ?? 30)));
    const months = Math.min(36, Math.max(1, Math.floor(params?.months ?? 12)));
    const topLimit = Math.min(50, Math.max(1, Math.floor(params?.topLimit ?? 10)));
    const lowStockThreshold = Math.min(100000, Math.max(0, Math.floor(params?.lowStockThreshold ?? 10)));

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysStart = new Date(now);
    daysStart.setHours(0, 0, 0, 0);
    daysStart.setDate(daysStart.getDate() - (days - 1));
    const monthsStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    const [todayAgg] = await db
      .select({
        todayTransactions: sql<number>`COUNT(*)`,
        todaySales: sql<string>`COALESCE(SUM(${sales.finalAmount}), 0)`,
      })
      .from(sales)
      .where(and(eq(sales.status, "COMPLETED"), sql`${sales.transactionDate} >= ${todayStart}`));

    const [todayItemsAgg] = await db
      .select({
        todayItemsSold: sql<number>`COALESCE(SUM(CASE WHEN ${saleItems.conversionQty} > 0 THEN ${saleItems.conversionQty} ELSE ${saleItems.quantity} END), 0)`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(and(eq(sales.status, "COMPLETED"), sql`${sales.transactionDate} >= ${todayStart}`));

    const [monthAgg] = await db
      .select({
        monthSales: sql<string>`COALESCE(SUM(${sales.finalAmount}), 0)`,
      })
      .from(sales)
      .where(and(eq(sales.status, "COMPLETED"), sql`${sales.transactionDate} >= ${monthStart}`));

    const [pendingAgg] = await db
      .select({
        pendingCount: sql<number>`COUNT(*)`,
      })
      .from(suspendedSales);

    const [lowStockAgg] = await db
      .select({
        lowStockCount: sql<number>`COUNT(*)`,
      })
      .from(products)
      .where(sql`${products.stock} <= ${lowStockThreshold}`);

    const lowStockProducts = await db
      .select({
        id: products.id,
        name: products.name,
        stock: products.stock,
      })
      .from(products)
      .where(sql`${products.stock} <= ${lowStockThreshold}`)
      .orderBy(products.stock)
      .limit(8);

    const activeShiftRows = await db
      .select({
        id: cashierShifts.id,
        userId: cashierShifts.userId,
        userName: cashierShifts.userName,
        userRole: cashierShifts.userRole,
        terminalName: cashierShifts.terminalName,
        openedAt: cashierShifts.openedAt,
        openingCash: cashierShifts.openingCash,
      })
      .from(cashierShifts)
      .where(inArray(cashierShifts.status, ["OPEN", "ACTIVE"]))
      .orderBy(desc(cashierShifts.openedAt));

    const activeShiftIds = activeShiftRows.map(s => s.id);

    const activeSalesAgg = activeShiftIds.length
      ? await db
          .select({
            shiftId: sales.shiftId,
            totalTransactions: sql<number>`COUNT(*)`,
            totalSales: sql<string>`COALESCE(SUM(${sales.finalAmount}), 0)`,
            cashSales: sql<string>`COALESCE(SUM(CASE WHEN ${sales.paymentMethod} = 'cash' THEN ${sales.finalAmount} ELSE 0 END), 0)`,
          })
          .from(sales)
          .where(and(inArray(sales.shiftId, activeShiftIds), sql`${sales.status} <> 'CANCELLED'`))
          .groupBy(sales.shiftId)
      : [];

    const activeRefundAgg = activeShiftIds.length
      ? await db
          .select({
            shiftId: returns.shiftId,
            cashRefunds: sql<string>`COALESCE(SUM(CASE WHEN ${returns.refundMethod} = 'cash' THEN ${returns.totalRefund} ELSE 0 END), 0)`,
          })
          .from(returns)
          .where(and(inArray(returns.shiftId, activeShiftIds), eq(returns.status, "COMPLETED")))
          .groupBy(returns.shiftId)
      : [];

    const salesAggByShift = new Map<number, { totalTransactions: number; totalSales: number; cashSales: number }>();
    activeSalesAgg.forEach(r => {
      const id = Number(r.shiftId);
      salesAggByShift.set(id, {
        totalTransactions: Number(r.totalTransactions ?? 0),
        totalSales: Number(r.totalSales ?? 0),
        cashSales: Number(r.cashSales ?? 0),
      });
    });

    const refundAggByShift = new Map<number, number>();
    activeRefundAgg.forEach(r => {
      const id = Number(r.shiftId);
      refundAggByShift.set(id, Number(r.cashRefunds ?? 0));
    });

    const activeShifts = activeShiftRows.map(s => {
      const sAgg = salesAggByShift.get(s.id) ?? { totalTransactions: 0, totalSales: 0, cashSales: 0 };
      const cashRefunds = refundAggByShift.get(s.id) ?? 0;
      const openingCash = Number(s.openingCash ?? 0);
      const expectedCash = openingCash + sAgg.cashSales - cashRefunds;
      return {
        id: s.id,
        userId: s.userId,
        userName: s.userName,
        userRole: s.userRole,
        terminalName: s.terminalName ?? null,
        openedAt: s.openedAt ?? null,
        openingCash,
        totalTransactions: sAgg.totalTransactions,
        totalSales: sAgg.totalSales,
        cashSales: sAgg.cashSales,
        cashRefunds,
        expectedCash,
      };
    });

    const activeExpectedCash = activeShifts.reduce((acc, s) => acc + s.expectedCash, 0);

    const dailySales = await db
      .select({
        date: sql<string>`DATE(${sales.transactionDate})`,
        totalSales: sql<string>`COALESCE(SUM(${sales.finalAmount}), 0)`,
        cashSales: sql<string>`COALESCE(SUM(CASE WHEN ${sales.paymentMethod} = 'cash' THEN ${sales.finalAmount} ELSE 0 END), 0)`,
        nonCashSales: sql<string>`COALESCE(SUM(CASE WHEN ${sales.paymentMethod} != 'cash' THEN ${sales.finalAmount} ELSE 0 END), 0)`,
        transactions: sql<number>`COUNT(*)`,
      })
      .from(sales)
      .where(and(sql`${sales.status} <> 'CANCELLED'`, sql`${sales.transactionDate} >= ${daysStart}`))
      .groupBy(sql`DATE(${sales.transactionDate})`)
      .orderBy(sql`DATE(${sales.transactionDate})`);

    const monthlySales = await db
      .select({
        month: sql<string>`DATE_FORMAT(${sales.transactionDate}, '%Y-%m')`,
        totalSales: sql<string>`COALESCE(SUM(${sales.finalAmount}), 0)`,
        transactions: sql<number>`COUNT(*)`,
      })
      .from(sales)
      .where(and(sql`${sales.status} <> 'CANCELLED'`, sql`${sales.transactionDate} >= ${monthsStart}`))
      .groupBy(sql`DATE_FORMAT(${sales.transactionDate}, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(${sales.transactionDate}, '%Y-%m')`);

    const paymentBreakdown = await db
      .select({
        method: sales.paymentMethod,
        totalSales: sql<string>`COALESCE(SUM(${sales.finalAmount}), 0)`,
        transactions: sql<number>`COUNT(*)`,
      })
      .from(sales)
      .where(and(eq(sales.status, "COMPLETED"), sql`${sales.transactionDate} >= ${daysStart}`))
      .groupBy(sales.paymentMethod)
      .orderBy(desc(sql`COALESCE(SUM(${sales.finalAmount}), 0)`));

    const topProducts = await db
      .select({
        productId: products.id,
        productName: products.name,
        quantitySold: sql<number>`COALESCE(SUM(CASE WHEN ${saleItems.conversionQty} > 0 THEN ${saleItems.conversionQty} ELSE ${saleItems.quantity} END), 0)`,
        totalRevenue: sql<string>`COALESCE(SUM(${saleItems.subtotal}), 0)`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(and(eq(sales.status, "COMPLETED"), sql`${sales.transactionDate} >= ${daysStart}`))
      .groupBy(products.id, products.name)
      .orderBy(desc(sql`COALESCE(SUM(${saleItems.subtotal}), 0)`))
      .limit(topLimit);

    const cashDiscrepancies = await db
      .select({
        shiftId: cashierShifts.id,
        userName: cashierShifts.userName,
        terminalName: cashierShifts.terminalName,
        closedAt: cashierShifts.closedAt,
        cashDifference: cashierShifts.cashDifference,
      })
      .from(cashierShifts)
      .where(and(eq(cashierShifts.status, "CLOSED"), sql`ABS(COALESCE(${cashierShifts.cashDifference}, 0)) > 0`))
      .orderBy(desc(cashierShifts.closedAt))
      .limit(8);

    return {
      summary: {
        todaySales: Number(todayAgg?.todaySales ?? 0),
        todayTransactions: Number(todayAgg?.todayTransactions ?? 0),
        monthSales: Number(monthAgg?.monthSales ?? 0),
        todayItemsSold: Number(todayItemsAgg?.todayItemsSold ?? 0),
        lowStockCount: Number(lowStockAgg?.lowStockCount ?? 0),
        activeExpectedCash,
        activeShiftCount: activeShifts.length,
        pendingCount: Number(pendingAgg?.pendingCount ?? 0),
      },
      charts: {
        dailySales: dailySales.map(r => ({
          date: r.date,
          totalSales: Number(r.totalSales ?? 0),
          cashSales: Number(r.cashSales ?? 0),
          nonCashSales: Number(r.nonCashSales ?? 0),
          transactions: Number(r.transactions ?? 0),
        })),
        monthlySales: monthlySales.map(r => ({
          month: r.month,
          totalSales: Number(r.totalSales ?? 0),
          transactions: Number(r.transactions ?? 0),
        })),
        paymentBreakdown: paymentBreakdown.map(r => ({
          method: String(r.method ?? ""),
          totalSales: Number(r.totalSales ?? 0),
          transactions: Number(r.transactions ?? 0),
        })),
        topProducts: topProducts.map(r => ({
          productId: Number(r.productId),
          productName: r.productName,
          quantitySold: Number(r.quantitySold ?? 0),
          totalRevenue: Number(r.totalRevenue ?? 0),
        })),
      },
      operational: {
        activeShifts,
        lowStockProducts: lowStockProducts.map(p => ({ id: p.id, name: p.name, stock: p.stock })),
        cashDiscrepancies: cashDiscrepancies.map(r => ({
          shiftId: r.shiftId,
          userName: r.userName,
          terminalName: r.terminalName ?? null,
          closedAt: r.closedAt ?? null,
          cashDifference: Number(r.cashDifference ?? 0),
        })),
      },
    };
  }

  async getDailyStats() {
    // Simple mock stats or real aggregation
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySales = await db.select().from(sales)
      .where(sql`${sales.transactionDate} >= ${today.toISOString()}`);

    const totalTransactions = todaySales.length;
    const totalRevenue = todaySales.reduce((acc, sale) => acc + Number(sale.finalAmount), 0);
    
    // Calculate total items sold today
    const [itemStats] = await db.select({
      count: sql<number>`sum(case when ${saleItems.conversionQty} > 0 then ${saleItems.conversionQty} else ${saleItems.quantity} end)`
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(sql`${sales.transactionDate} >= ${today.toISOString()}`);

    const totalItems = Number(itemStats?.count || 0);

    return { totalTransactions, totalItems, totalRevenue };
  }
}

export const storage = new DatabaseStorage();
