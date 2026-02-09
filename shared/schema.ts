
import { pgTable, text, serial, integer, boolean, timestamp, decimal, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// Users & Roles
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role", { enum: ["admin", "cashier"] }).notNull().default("cashier"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Brands
export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

// Products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  barcode: text("barcode").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  brandId: integer("brand_id").references(() => brands.id),
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
  stock: integer("stock").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customers (Members)
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").unique(),
  totalPoints: integer("total_points").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Sales Transactions
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  invoiceNo: text("invoice_no").notNull().unique(),
  transactionDate: timestamp("transaction_date").defaultNow(),
  cashierId: integer("cashier_id").references(() => users.id),
  customerId: integer("customer_id").references(() => customers.id),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0"),
  finalAmount: decimal("final_amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull().default("cash"),
});

// Sale Items
export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").references(() => sales.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  priceAtSale: decimal("price_at_sale", { precision: 10, scale: 2 }).notNull(),
  discountAtSale: decimal("discount_at_sale", { precision: 10, scale: 2 }).default("0"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
});

// Point Logs
export const pointLogs = pgTable("point_logs", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  saleId: integer("sale_id").references(() => sales.id), // Optional, could be manual adjustment
  pointsChange: integer("points_change").notNull(), // Can be negative for usage
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===

export const productsRelations = relations(products, ({ one }) => ({
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
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

// === ZOD SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertBrandSchema = createInsertSchema(brands).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, totalPoints: true, createdAt: true });
export const insertSaleSchema = createInsertSchema(sales).omit({ id: true, invoiceNo: true, transactionDate: true }); // Invoice generated backend
export const insertSaleItemSchema = createInsertSchema(saleItems).omit({ id: true, saleId: true });

// Custom Input Types for API
export const checkoutSchema = z.object({
  customerId: z.number().optional(),
  items: z.array(z.object({
    productId: z.number(),
    quantity: z.number().min(1),
    discount: z.number().min(0).default(0), // Per item discount amount
  })),
  globalDiscount: z.number().min(0).default(0), // Transaction level discount
  paymentMethod: z.string().default("cash"),
});

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Brand = typeof brands.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type SaleItem = typeof saleItems.$inferSelect;
export type CheckoutRequest = z.infer<typeof checkoutSchema>;
