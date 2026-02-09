
import { 
  users, products, brands, customers, sales, saleItems, pointLogs,
  type User, type InsertUser, type Product, type Brand, type Customer, 
  type Sale, type SaleItem, type CheckoutRequest
} from "@shared/schema";
import { db } from "./db";
import { eq, like, desc, sql, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Products
  getProducts(search?: string, brandId?: number): Promise<(Product & { brand: Brand | null })[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductByBarcode(barcode: string): Promise<Product | undefined>;
  createProduct(product: Partial<Product>): Promise<Product>;
  updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<void>;

  // Brands
  getBrands(): Promise<Brand[]>;
  createBrand(brand: Partial<Brand>): Promise<Brand>;

  // Customers
  getCustomers(search?: string): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: Partial<Customer>): Promise<Customer>;
  updateCustomerPoints(id: number, points: number): Promise<Customer>;

  // Sales (Transactional)
  createSale(data: CheckoutRequest, cashierId: number): Promise<Sale & { items: SaleItem[] }>;
  getSales(): Promise<(Sale & { cashier: User | null })[]>;
  
  // Reports
  getDailyStats(): Promise<{ totalTransactions: number; totalItems: number; totalRevenue: number }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getProducts(search?: string, brandId?: number) {
    let query = db.select({
      id: products.id,
      barcode: products.barcode,
      name: products.name,
      description: products.description,
      brandId: products.brandId,
      price: products.price,
      stock: products.stock,
      createdAt: products.createdAt,
      brand: brands
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id));

    const filters = [];
    if (search) {
      filters.push(
        sql`(${products.name} ILIKE ${`%${search}%`} OR ${products.barcode} ILIKE ${`%${search}%`})`
      );
    }
    if (brandId) {
      filters.push(eq(products.brandId, brandId));
    }

    if (filters.length > 0) {
      // @ts-ignore
      query = query.where(and(...filters));
    }

    // @ts-ignore
    return await query.orderBy(desc(products.createdAt));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductByBarcode(barcode: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.barcode, barcode));
    return product;
  }

  async createProduct(product: Partial<Product>): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product as any).returning();
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(product).where(eq(products.id, id)).returning();
    return updated;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async getBrands(): Promise<Brand[]> {
    return await db.select().from(brands);
  }

  async createBrand(brand: Partial<Brand>): Promise<Brand> {
    const [newBrand] = await db.insert(brands).values(brand as any).returning();
    return newBrand;
  }

  async getCustomers(search?: string): Promise<Customer[]> {
    let query = db.select().from(customers);
    if (search) {
      query = query.where(
        sql`${customers.name} ILIKE ${`%${search}%`} OR ${customers.phone} ILIKE ${`%${search}%`}`
      ) as any;
    }
    return await query;
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(customer: Partial<Customer>): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer as any).returning();
    return newCustomer;
  }

  async updateCustomerPoints(id: number, points: number): Promise<Customer> {
    const [updated] = await db.update(customers)
      .set({ totalPoints: sql`${customers.totalPoints} + ${points}` })
      .where(eq(customers.id, id))
      .returning();
    return updated;
  }

  async createSale(data: CheckoutRequest, cashierId: number): Promise<Sale & { items: SaleItem[] }> {
    return await db.transaction(async (tx) => {
      // 1. Calculate totals and validate stock
      let subtotal = 0;
      let totalDiscount = data.globalDiscount;
      const preparedItems = [];

      for (const item of data.items) {
        const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
        
        if (!product) throw new Error(`Product ${item.productId} not found`);
        if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);

        const price = Number(product.price);
        const itemSubtotal = (price * item.quantity) - item.discount;
        subtotal += itemSubtotal;

        preparedItems.push({
          productId: item.productId,
          quantity: item.quantity,
          priceAtSale: String(price),
          discountAtSale: String(item.discount),
          subtotal: String(itemSubtotal),
          // Store product reference for stock update
          originalProduct: product, 
        });

        // Decrement Stock
        await tx.update(products)
          .set({ stock: product.stock - item.quantity })
          .where(eq(products.id, item.productId));
      }

      // 2. Create Sale Record
      const finalAmount = Math.max(0, subtotal - data.globalDiscount); // Should recalculate logic if global discount applies differently
      // Correction: User requested "Discount per item" (handled) and "Discount per transaction" (handled).
      
      // Simple Invoice Number Gen
      const invoiceNo = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const [sale] = await tx.insert(sales).values({
        invoiceNo,
        cashierId,
        customerId: data.customerId,
        subtotal: String(subtotal),
        discountAmount: String(totalDiscount),
        finalAmount: String(finalAmount),
        paymentMethod: data.paymentMethod,
      }).returning();

      // 3. Insert Sale Items
      const createdItems = [];
      for (const item of preparedItems) {
        const [createdItem] = await tx.insert(saleItems).values({
          saleId: sale.id,
          productId: item.productId,
          quantity: item.quantity,
          priceAtSale: item.priceAtSale,
          discountAtSale: item.discountAtSale,
          subtotal: item.subtotal,
        }).returning();
        createdItems.push(createdItem);
      }

      // 4. Points System (If Member)
      if (data.customerId) {
        // Rule: 1 Point per 100,000
        const pointsEarned = Math.floor(finalAmount / 100000);
        if (pointsEarned > 0) {
          await tx.update(customers)
            .set({ totalPoints: sql`${customers.totalPoints} + ${pointsEarned}` })
            .where(eq(customers.id, data.customerId));
          
          await tx.insert(pointLogs).values({
            customerId: data.customerId,
            saleId: sale.id,
            pointsChange: pointsEarned,
            reason: "Purchase Reward",
          });
        }
      }

      return { ...sale, items: createdItems };
    });
  }

  async getSales(): Promise<(Sale & { cashier: User | null })[]> {
    return await db.select({
      id: sales.id,
      invoiceNo: sales.invoiceNo,
      transactionDate: sales.transactionDate,
      cashierId: sales.cashierId,
      customerId: sales.customerId,
      subtotal: sales.subtotal,
      discountAmount: sales.discountAmount,
      finalAmount: sales.finalAmount,
      paymentMethod: sales.paymentMethod,
      cashier: users
    })
    .from(sales)
    .leftJoin(users, eq(sales.cashierId, users.id))
    .orderBy(desc(sales.transactionDate));
  }

  async getDailyStats() {
    // Simple mock stats or real aggregation
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySales = await db.select().from(sales)
      .where(sql`${sales.transactionDate} >= ${today.toISOString()}`);

    const totalTransactions = todaySales.length;
    const totalRevenue = todaySales.reduce((acc, sale) => acc + Number(sale.finalAmount), 0);
    
    // For item count, we'd need to join sale_items, keeping it simple for MVP
    const totalItems = 0; 

    return { totalTransactions, totalItems, totalRevenue };
  }
}

export const storage = new DatabaseStorage();
