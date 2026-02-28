
import { mysqlTable, text, longtext, int, boolean, timestamp, decimal, varchar, datetime } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// Users & Roles
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("cashier"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Brands
export const brands = mysqlTable("brands", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  categoryId: int("category_id").notNull(),
  status: varchar("status", { length: 10 }).notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Categories
export const categories = mysqlTable("categories", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  status: varchar("status", { length: 10 }).notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Suppliers
export const suppliers = mysqlTable("suppliers", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  status: varchar("status", { length: 10 }).notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Products
export const products = mysqlTable("products", {
  id: int("id").primaryKey().autoincrement(),
  barcode: varchar("barcode", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  brandId: int("brand_id").notNull(),
  categoryId: int("category_id").notNull(),
  supplierId: int("supplier_id").notNull(),
  status: varchar("status", { length: 10 }).notNull().default("ACTIVE"),
  deletedAt: datetime("deleted_at"),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }).notNull().default("0"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
  pcsPerCarton: int("pcs_per_carton").notNull().default(1),
  cartonPrice: decimal("carton_price", { precision: 10, scale: 2 }),
  supportsCarton: boolean("supports_carton").notNull().default(false),
  stock: int("stock").notNull().default(0),
  minStock: int("min_stock").notNull().default(0),
  image: longtext("image"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const productPriceAudits = mysqlTable("product_price_audits", {
  id: int("id").primaryKey().autoincrement(),
  productId: int("product_id").notNull(),
  changedBy: int("changed_by"),
  field: varchar("field", { length: 50 }).notNull(),
  oldValue: varchar("old_value", { length: 64 }),
  newValue: varchar("new_value", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customers (Members)
export const customers = mysqlTable("customers", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).unique(),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  customerType: varchar("customer_type", { length: 20 }).notNull().default("regular"),
  totalPoints: int("total_points").notNull().default(0),
  totalSpending: decimal("total_spending", { precision: 14, scale: 2 }).notNull().default("0"),
  tierLevel: varchar("tier_level", { length: 20 }).notNull().default("REGULAR"),
  status: varchar("status", { length: 10 }).notNull().default("ACTIVE"),
  deletedAt: datetime("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Sales Transactions
export const sales = mysqlTable("sales", {
  id: int("id").primaryKey().autoincrement(),
  invoiceNo: varchar("invoice_no", { length: 100 }).notNull().unique(),
  transactionDate: timestamp("transaction_date").defaultNow(),
  shiftId: int("shift_id"),
  cashierId: int("cashier_id"),
  customerId: int("customer_id"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0"),
  itemDiscountAmount: decimal("item_discount_amount", { precision: 12, scale: 2 }).default("0"),
  globalDiscountAmount: decimal("global_discount_amount", { precision: 12, scale: 2 }).default("0"),
  appliedGlobalDiscountId: int("applied_global_discount_id"),
  redeemedPoints: int("redeemed_points").notNull().default(0),
  redeemedAmount: decimal("redeemed_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  pointsEarned: int("points_earned").notNull().default(0),
  finalAmount: decimal("final_amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull().default("cash"),
  status: varchar("status", { length: 20 }).notNull().default("COMPLETED"),
  cancelledAt: datetime("cancelled_at"),
  cancelledBy: int("cancelled_by"),
  cancelledShiftId: int("cancelled_shift_id"),
});

export const cashierShifts = mysqlTable("cashier_shifts", {
  id: int("id").primaryKey().autoincrement(),
  shiftCode: varchar("shift_code", { length: 50 }),
  userId: int("user_id").notNull(),
  userName: varchar("user_name", { length: 255 }).notNull(),
  userRole: varchar("user_role", { length: 50 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: varchar("user_agent", { length: 255 }),
  openedAt: timestamp("opened_at").defaultNow(),
  closedAt: datetime("closed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  openingCash: decimal("opening_cash", { precision: 12, scale: 2 }).notNull(),
  expectedCash: decimal("expected_cash", { precision: 12, scale: 2 }),
  systemCashTotal: decimal("system_cash_total", { precision: 12, scale: 2 }),
  actualCash: decimal("actual_cash", { precision: 12, scale: 2 }),
  cashDifference: decimal("cash_difference", { precision: 12, scale: 2 }),
  totalTransactions: int("total_transactions").notNull().default(0),
  totalSales: decimal("total_sales", { precision: 12, scale: 2 }).notNull().default("0"),
  totalRefund: decimal("total_refund", { precision: 12, scale: 2 }).notNull().default("0"),
  cashRefunds: decimal("cash_refunds", { precision: 12, scale: 2 }).notNull().default("0"),
  nonCashRefunds: decimal("non_cash_refunds", { precision: 12, scale: 2 }).notNull().default("0"),
  totalDiscount: decimal("total_discount", { precision: 12, scale: 2 }).notNull().default("0"),
  totalPointUsed: int("total_point_used").notNull().default(0),
  totalPointEarned: int("total_point_earned").notNull().default(0),
  pointsReversed: int("points_reversed").notNull().default(0),
  pointsRestored: int("points_restored").notNull().default(0),
  totalCashSales: decimal("total_cash_sales", { precision: 12, scale: 2 }).notNull().default("0"),
  totalNonCashSales: decimal("total_non_cash_sales", { precision: 12, scale: 2 }).notNull().default("0"),
  totalVoid: int("total_void").notNull().default(0),
  totalReturns: int("total_returns").notNull().default(0),
  pointTxCount: int("point_tx_count").notNull().default(0),
  bigDiscountTxCount: int("big_discount_tx_count").notNull().default(0),
  approvalStatus: varchar("approval_status", { length: 20 }).notNull().default("NONE"),
  approvedBy: int("approved_by"),
  approvedAt: datetime("approved_at"),
  approvalNote: varchar("approval_note", { length: 255 }),
  paymentBreakdown: longtext("payment_breakdown"),
  note: varchar("note", { length: 255 }),
  closeNote: varchar("close_note", { length: 255 }),
  terminalName: varchar("terminal_name", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull().default("OPEN"),
});

export const suspendedSales = mysqlTable("suspended_sales", {
  id: int("id").primaryKey().autoincrement(),
  cashierId: int("cashier_id").notNull(),
  customerId: int("customer_id"),
  note: varchar("note", { length: 255 }),
  payload: longtext("payload").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Discounts
export const discounts = mysqlTable("discounts", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull().default("percentage"), // percentage or fixed
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  appliesTo: varchar("applies_to", { length: 20 }).notNull().default("global"),
  startDate: datetime("start_date"),
  endDate: datetime("end_date"),
  active: boolean("active").default(true),
  status: varchar("status", { length: 10 }).notNull().default("ACTIVE"),
  minimumPurchase: decimal("minimum_purchase", { precision: 12, scale: 2 }).notNull().default("0"),
  priorityLevel: int("priority_level").notNull().default(0),
  stackable: boolean("stackable").notNull().default(false),
  customerType: varchar("customer_type", { length: 20 }),
  description: text("description"),
  productId: int("product_id"), // Optional: specific product
  brandId: int("brand_id"), // Optional: specific brand
  categoryId: int("category_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Sale Items
export const saleItems = mysqlTable("sale_items", {
  id: int("id").primaryKey().autoincrement(),
  saleId: int("sale_id").notNull(),
  productId: int("product_id").notNull(),
  quantity: int("quantity").notNull(),
  unitType: varchar("unit_type", { length: 20 }).notNull().default("PCS"),
  conversionQty: int("conversion_qty").notNull().default(0),
  priceAtSale: decimal("price_at_sale", { precision: 10, scale: 2 }).notNull(),
  discountAtSale: decimal("discount_at_sale", { precision: 10, scale: 2 }).default("0"),
  appliedDiscountId: int("applied_discount_id"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
});

// Returns
export const returns = mysqlTable("returns", {
  id: int("id").primaryKey().autoincrement(),
  saleId: int("sale_id").notNull(),
  shiftId: int("shift_id"),
  returnNumber: varchar("return_number", { length: 50 }).notNull(),
  customerId: int("customer_id"),
  cashierId: int("cashier_id"),
  returnDate: timestamp("return_date").defaultNow(),
  totalRefund: decimal("total_refund", { precision: 12, scale: 2 }).notNull(),
  refundMethod: varchar("refund_method", { length: 50 }).notNull().default("cash"),
  pointsReversed: int("points_reversed").notNull().default(0),
  pointsRestored: int("points_restored").notNull().default(0),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("COMPLETED"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Return Items
export const returnItems = mysqlTable("return_items", {
  id: int("id").primaryKey().autoincrement(),
  returnId: int("return_id").notNull(),
  productId: int("product_id").notNull(),
  quantity: int("quantity").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }).notNull(),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").primaryKey().autoincrement(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: int("entity_id").notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  actorId: int("actor_id"),
  metadata: longtext("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Point Logs
export const pointLogs = mysqlTable("point_logs", {
  id: int("id").primaryKey().autoincrement(),
  customerId: int("customer_id").notNull(),
  saleId: int("sale_id"), // Optional, could be manual adjustment
  pointsChange: int("points_change").notNull(), // Can be negative for usage
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appSettings = mysqlTable("app_settings", {
  id: int("id").primaryKey().autoincrement(),
  storeName: varchar("store_name", { length: 255 }).notNull().default("Barokah Frozen Food"),
  storeAddress: varchar("store_address", { length: 255 }),
  receiptFooter: varchar("receipt_footer", { length: 255 }),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const loyaltySettings = mysqlTable("loyalty_settings", {
  id: int("id").primaryKey().autoincrement(),
  earnAmountPerPoint: decimal("earn_amount_per_point", { precision: 12, scale: 2 }).notNull().default("10000"),
  redeemAmountPerPoint: decimal("redeem_amount_per_point", { precision: 12, scale: 2 }).notNull().default("100"),
  silverMinSpending: decimal("silver_min_spending", { precision: 14, scale: 2 }).notNull().default("1000000"),
  goldMinSpending: decimal("gold_min_spending", { precision: 14, scale: 2 }).notNull().default("5000000"),
  platinumMinSpending: decimal("platinum_min_spending", { precision: 14, scale: 2 }).notNull().default("10000000"),
  silverPointMultiplier: decimal("silver_point_multiplier", { precision: 6, scale: 2 }).notNull().default("1.00"),
  goldPointMultiplier: decimal("gold_point_multiplier", { precision: 6, scale: 2 }).notNull().default("1.25"),
  platinumPointMultiplier: decimal("platinum_point_multiplier", { precision: 6, scale: 2 }).notNull().default("1.50"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === RELATIONS ===

export const productsRelations = relations(products, ({ one }) => ({
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  supplier: one(suppliers, {
    fields: [products.supplierId],
    references: [suppliers.id],
  }),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  shift: one(cashierShifts, {
    fields: [sales.shiftId],
    references: [cashierShifts.id],
  }),
  cashier: one(users, {
    fields: [sales.cashierId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  items: many(saleItems),
}));

export const cashierShiftsRelations = relations(cashierShifts, ({ one, many }) => ({
  user: one(users, {
    fields: [cashierShifts.userId],
    references: [users.id],
  }),
  sales: many(sales),
  returns: many(returns),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
}));

export const returnsRelations = relations(returns, ({ one, many }) => ({
  sale: one(sales, {
    fields: [returns.saleId],
    references: [sales.id],
  }),
  shift: one(cashierShifts, {
    fields: [returns.shiftId],
    references: [cashierShifts.id],
  }),
  items: many(returnItems),
}));

export const returnItemsRelations = relations(returnItems, ({ one }) => ({
  parentReturn: one(returns, {
    fields: [returnItems.returnId],
    references: [returns.id],
  }),
  product: one(products, {
    fields: [returnItems.productId],
    references: [products.id],
  }),
}));

// === ZOD SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertBrandSchema = createInsertSchema(brands).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
}).extend({
  image: z.string().optional(),
});
export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  totalPoints: true,
  totalSpending: true,
  tierLevel: true,
  status: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  customerType: z.enum(["regular", "member", "vip"]).default("regular"),
});
export const insertSaleSchema = createInsertSchema(sales).omit({ id: true, invoiceNo: true, transactionDate: true }); // Invoice generated backend
export const insertSaleItemSchema = createInsertSchema(saleItems).omit({ id: true, saleId: true });
export const insertDiscountSchema = createInsertSchema(discounts, {
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  productId: z.coerce.number().optional(),
  brandId: z.coerce.number().optional(),
  categoryId: z.coerce.number().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

// Custom Input Types for API
export const checkoutSchema = z.object({
  customerId: z.number().optional(),
  pointsToRedeem: z.number().int().min(0).default(0),
  items: z.array(z.object({
    productId: z.number(),
    quantity: z.number().min(1),
    unitType: z.enum(["PCS", "CARTON"]).default("PCS"),
    discount: z.number().min(0).default(0), // Per item discount amount
  })),
  globalDiscount: z.number().min(0).default(0), // Transaction level discount
  paymentMethod: z.string().default("cash"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Product = typeof products.$inferSelect;
export type ProductPriceAudit = typeof productPriceAudits.$inferSelect;
export type Brand = typeof brands.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type CashierShift = typeof cashierShifts.$inferSelect;
export type SuspendedSale = typeof suspendedSales.$inferSelect;
export type SaleItem = typeof saleItems.$inferSelect;
export type Return = typeof returns.$inferSelect;
export type ReturnItem = typeof returnItems.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Discount = typeof discounts.$inferSelect;
export type AppSettings = typeof appSettings.$inferSelect;
export type CheckoutRequest = z.infer<typeof checkoutSchema>;
