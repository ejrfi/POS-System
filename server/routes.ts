
import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import jwt from "jsonwebtoken";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import bcrypt from "bcryptjs";
import { CashierShiftService } from "./services/cashierShiftService";
import { createCashierShiftController } from "./controllers/cashierShiftController";
import { DashboardService } from "./services/dashboardService";
import { createDashboardController } from "./controllers/dashboardController";
import { TransactionService } from "./services/transactionService";
import { ReturnService } from "./services/returnService";
import { ReportService } from "./services/reportService";
import { LoyaltyService } from "./services/loyaltyService";
import { BusinessError } from "./errors";
import { InventoryRepository } from "./modules/inventory/inventory.repository";
import { InventoryService } from "./modules/inventory/inventory.service";
import { ProductDeletionService } from "./modules/inventory/productDeletion.service";
import { InitializationService } from "./services/initializationService";
import { BackupService } from "./services/backupService";

const scryptAsync = promisify(scrypt);
const JWT_SECRET = process.env.JWT_SECRET || "pos_jwt_secret_key_123";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      cashierShift?: any;
    }
  }
}

async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

async function comparePassword(supplied: string, stored: string) {
  return await bcrypt.compare(supplied, stored);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // === AUTH MIDDLEWARE ===
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: "Unauthorized: No token provided" });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ message: "Forbidden: Invalid token" });
      req.user = user;
      next();
    });
  };

  const requireAuth = authenticateToken;

  const requireAdmin = (req: any, res: any, next: any) => {
    authenticateToken(req, res, () => {
      if (req.user && req.user.role === "admin") {
        next();
      } else {
        res.status(403).json({ message: "Forbidden: Admin access required" });
      }
    });
  };

  const requireSupervisor = (req: any, res: any, next: any) => {
    authenticateToken(req, res, () => {
      if (req.user && (req.user.role === "admin" || req.user.role === "supervisor")) {
        next();
      } else {
        res.status(403).json({ message: "Forbidden: Supervisor access required" });
      }
    });
  };

  const requireManager = requireSupervisor;

  const requireActiveShift = async (req: any, res: any, next: any) => {
    try {
      const user = req.user as any;
      const shift = await storage.getActiveCashierShift(user.id);
      if (!shift) return res.status(409).json({ message: "Shift kasir belum dibuka" });
      req.cashierShift = shift;
      next();
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "Failed to validate shift" });
    }
  };

  const cashierShiftService = new CashierShiftService(storage);
  const cashierShiftController = createCashierShiftController(cashierShiftService);
  const dashboardService = new DashboardService(storage);
  const dashboardController = createDashboardController(dashboardService);
  const transactionService = new TransactionService(storage);
  const returnService = new ReturnService(storage);
  const reportService = new ReportService(storage);
  const loyaltyService = new LoyaltyService(storage);
  const inventoryService = new InventoryService(new InventoryRepository());
  const productDeletionService = new ProductDeletionService();

  // === FILE UPLOAD CONFIGURATION (BASE64) ===
  // We use memory storage to get the buffer directly
  const storageConfig = multer.memoryStorage();

  const upload = multer({ 
    storage: storageConfig,
    limits: { fileSize: 2 * 1024 * 1024 }, // Limit to 2MB for database performance
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (extname && mimetype) {
        return cb(null, true);
      }
      cb(new Error('Only images are allowed'));
    }
  });

  // === UPLOAD ROUTE ===
  app.post('/api/upload', requireAuth, upload.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    // Convert buffer to Base64 string
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const mime = req.file.mimetype;
    const dataURI = `data:${mime};base64,${b64}`;
    
    // Return Data URI directly. Frontend will save this string to DB.
    res.json({ url: dataURI });
  });

  // === AUTH ROUTES ===
  app.post(api.auth.login.path, async (req, res) => {
    const { username, password } = req.body;
    const user = await storage.getUserByUsername(username);

    if (!user || !(await comparePassword(password, user.password))) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, fullName: user.fullName }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.json({ user, token });
  });

  app.post(api.auth.logout.path, requireAuth, async (req, res) => {
    const user = req.user as any;
    const shift = await storage.getActiveCashierShift(Number(user.id));
    if (shift) return res.status(409).json({ message: "Tidak bisa logout: shift masih aktif" });
    res.sendStatus(200);
  });

  app.get(api.auth.me.path, requireAuth, async (req, res) => {
    // Return user info from token or fetch fresh from DB
    const user = await storage.getUser(req.user.id);
    if (!user) return res.sendStatus(404);
    res.json(user);
  });

  // === API ROUTES ===

  app.get(api.users.list.path, requireAdmin, async (req, res) => {
    const input = api.users.list.input?.parse(req.query) ?? {};
    const items = await storage.getUsers({ search: input?.search });
    res.json(items);
  });

  app.post(api.users.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.users.create.input.parse(req.body);
      const existing = await storage.getUserByUsername(input.username);
      if (existing) {
        return res.status(409).json({ code: "USERNAME_EXISTS", message: "Username sudah digunakan" });
      }
      const password = await hashPassword(input.password);
      const created = await storage.createUser({
        username: input.username,
        password,
        fullName: input.fullName,
        role: input.role,
      } as any);
      res.status(201).json({
        id: created.id,
        username: created.username,
        fullName: created.fullName,
        role: created.role,
        createdAt: created.createdAt ?? null,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(422).json({ code: "VALIDATION_ERROR", message: "Input tidak valid", details: err.issues });
      }
      res.status(500).json({ code: "INTERNAL_ERROR", message: err?.message || "Terjadi kesalahan server" });
    }
  });

  app.put(api.users.update.path, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(422).json({ code: "VALIDATION_ERROR", message: "ID tidak valid" });
      }
      const input = api.users.update.input.parse(req.body);
      const existing = await storage.getUser(id);
      if (!existing) return res.status(404).json({ code: "NOT_FOUND", message: "User tidak ditemukan" });

      if (input.username && input.username !== existing.username) {
        const taken = await storage.getUserByUsername(input.username);
        if (taken && Number(taken.id) !== Number(id)) {
          return res.status(409).json({ code: "USERNAME_EXISTS", message: "Username sudah digunakan" });
        }
      }

      if (input.role && existing.role === "admin" && input.role !== "admin") {
        const admins = (await storage.getUsers()).filter(u => String(u.role) === "admin");
        if (admins.length <= 1 && admins.some(a => Number(a.id) === Number(id))) {
          return res.status(409).json({ code: "LAST_ADMIN", message: "Tidak bisa mengubah role admin terakhir" });
        }
      }

      const hashedPassword = input.password ? await hashPassword(input.password) : undefined;
      const updated = await storage.updateUser(id, {
        username: input.username,
        fullName: input.fullName,
        role: input.role,
        password: hashedPassword,
      });
      if (!updated) return res.status(404).json({ code: "NOT_FOUND", message: "User tidak ditemukan" });
      res.json(updated);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(422).json({ code: "VALIDATION_ERROR", message: "Input tidak valid", details: err.issues });
      }
      if (err instanceof BusinessError) {
        return res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
      }
      res.status(500).json({ code: "INTERNAL_ERROR", message: err?.message || "Terjadi kesalahan server" });
    }
  });

  app.delete(api.users.delete.path, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(422).json({ code: "VALIDATION_ERROR", message: "ID tidak valid" });
      }
      const actor = req.user as any;
      if (Number(actor?.id) === Number(id)) {
        return res.status(409).json({ code: "SELF_DELETE", message: "Tidak bisa menghapus user yang sedang login" });
      }

      const existing = await storage.getUser(id);
      if (!existing) return res.status(404).json({ code: "NOT_FOUND", message: "User tidak ditemukan" });

      if (existing.role === "admin") {
        const admins = (await storage.getUsers()).filter(u => String(u.role) === "admin");
        if (admins.length <= 1) {
          return res.status(409).json({ code: "LAST_ADMIN", message: "Tidak bisa menghapus admin terakhir" });
        }
      }

      await storage.deleteUser(id);
      res.sendStatus(204);
    } catch (err: any) {
      if (err instanceof BusinessError) {
        return res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
      }
      res.status(500).json({ code: "INTERNAL_ERROR", message: err?.message || "Terjadi kesalahan server" });
    }
  });

  app.get(api.cashierShifts.active.path, requireAuth, cashierShiftController.active);
  app.post(api.cashierShifts.open.path, requireAuth, cashierShiftController.open);
  app.post(api.cashierShifts.close.path, requireAuth, cashierShiftController.close);
  app.post(api.cashierShifts.approve.path, requireSupervisor, cashierShiftController.approve);
  app.get(api.cashierShifts.list.path, requireManager, cashierShiftController.list);
  app.get(api.cashierShifts.summary.path, requireAuth, cashierShiftController.summary);
  app.get(api.cashierShifts.transactions.path, requireAuth, cashierShiftController.transactions);

  app.get(api.dashboard.overview.path, requireAdmin, dashboardController.overview);

  // Products
  app.get(api.products.list.path, requireAuth, async (req, res) => {
    const search = req.query.search as string | undefined;
    const brandId = req.query.brandId ? Number(req.query.brandId) : undefined;
    const statusRaw = req.query.status as string | undefined;
    const status = statusRaw === "ACTIVE" || statusRaw === "INACTIVE" || statusRaw === "ARCHIVED" ? statusRaw : undefined;
    const products = await storage.getProducts(search, brandId, status);
    res.json(products);
  });

  app.get("/api/products/:id/delete-info", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const info = await productDeletionService.getDeleteInfo(id);
      res.json(info);
    } catch (err: any) {
      if (err instanceof BusinessError) {
        return res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
      }
      res.status(500).json({ code: "INTERNAL_ERROR", message: err?.message || "Terjadi kesalahan server" });
    }
  });

  app.get(api.pos.filters.path, requireAuth, async (_req, res) => {
    const data = await storage.getPosFilters();
    res.json(data);
  });

  app.get(api.pos.products.search.path, requireAuth, async (req, res) => {
    const input = api.pos.products.search.input?.parse({
      q: req.query.q,
      brandId: req.query.brandId,
      categoryId: req.query.categoryId,
      supplierId: req.query.supplierId,
      stockStatus: req.query.stockStatus,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      sort: req.query.sort,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    const data = await storage.searchPosProducts(input);
    res.json(data);
  });

  app.get(api.products.get.path, requireAuth, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Not found" });
    res.json(product);
  });

  app.get(api.products.getByBarcode.path, requireAuth, async (req, res) => {
    const product = await storage.getProductByBarcode(req.params.barcode);
    if (!product) return res.status(404).json({ message: "Not found" });
    res.json(product);
  });

  app.post(api.products.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      // Basic check for uniqueness handled by DB constraint, but better to catch here or let it fail
      const product = await storage.createProduct(input);
      res.status(201).json(product);
    } catch (err) {
      res.status(400).json({ message: "Invalid input or duplicate barcode" });
    }
  });

  app.put(api.products.update.path, requireAdmin, async (req, res) => {
    const input = api.products.update.input.parse(req.body);
    const user = req.user as any;
    const updated = await storage.updateProduct(Number(req.params.id), input, user?.id);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.delete(api.products.delete.path, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const mode = req.query.mode === "hard" ? "hard" : "soft";
      const user = req.user as any;
      await productDeletionService.deleteProduct({ productId: id, mode, actorRole: String(user?.role ?? "") });
      res.sendStatus(204);
    } catch (err: any) {
      if (err instanceof BusinessError) {
        return res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
      }
      res.status(500).json({ code: "INTERNAL_ERROR", message: err?.message || "Terjadi kesalahan server" });
    }
  });

  // Brands
  app.get(api.brands.list.path, requireAuth, async (req, res) => {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const includeInactive = req.query.includeInactive === "1";
    const items = await inventoryService.listBrands({ categoryId, includeInactive });
    res.json(items);
  });

  app.post(api.brands.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.brands.create.input.parse(req.body);
      const brand = await inventoryService.createBrand(input as any);
      res.status(201).json(brand);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(422).json({ code: "VALIDATION_ERROR", message: "Input tidak valid", details: err.issues });
      }
      if (err instanceof BusinessError) {
        return res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
      }
      res.status(500).json({ code: "INTERNAL_ERROR", message: err?.message || "Terjadi kesalahan server" });
    }
  });

  app.put("/api/brands/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = req.body as any;
      const updated = await inventoryService.updateBrand(id, input);
      if (!updated) return res.status(404).json({ code: "NOT_FOUND", message: "Brand tidak ditemukan" });
      res.json(updated);
    } catch (err: any) {
      if (err instanceof BusinessError) {
        return res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
      }
      res.status(500).json({ code: "INTERNAL_ERROR", message: err?.message || "Terjadi kesalahan server" });
    }
  });

  app.delete("/api/brands/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await inventoryService.setBrandStatus(id, "INACTIVE");
      res.sendStatus(204);
    } catch (err: any) {
      if (err instanceof BusinessError) {
        return res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
      }
      res.status(500).json({ code: "INTERNAL_ERROR", message: err?.message || "Terjadi kesalahan server" });
    }
  });

  // Categories
  app.get(api.categories.list.path, requireAuth, async (_req, res) => {
    const items = await inventoryService.listCategories({ includeInactive: true });
    res.json(items);
  });

  app.post(api.categories.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.categories.create.input.parse(req.body);
      const created = await inventoryService.createCategory(input as any);
      res.status(201).json(created);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(422).json({ code: "VALIDATION_ERROR", message: "Input tidak valid", details: err.issues });
      }
      if (err instanceof BusinessError) {
        return res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
      }
      res.status(500).json({ code: "INTERNAL_ERROR", message: err?.message || "Terjadi kesalahan server" });
    }
  });

  app.put("/api/categories/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = req.body as any;
      const updated = await inventoryService.updateCategory(id, input);
      if (!updated) return res.status(404).json({ code: "NOT_FOUND", message: "Kategori tidak ditemukan" });
      res.json(updated);
    } catch (err: any) {
      if (err instanceof BusinessError) {
        return res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
      }
      res.status(500).json({ code: "INTERNAL_ERROR", message: err?.message || "Terjadi kesalahan server" });
    }
  });

  app.delete("/api/categories/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await inventoryService.setCategoryStatus(id, "INACTIVE");
      res.sendStatus(204);
    } catch (err: any) {
      if (err instanceof BusinessError) {
        return res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
      }
      res.status(500).json({ code: "INTERNAL_ERROR", message: err?.message || "Terjadi kesalahan server" });
    }
  });

  // Suppliers
  app.get(api.suppliers.list.path, requireAuth, async (_req, res) => {
    const items = await storage.getSuppliers();
    res.json(items);
  });

  app.post(api.suppliers.create.path, requireAdmin, async (req, res) => {
    const input = api.suppliers.create.input.parse(req.body);
    const created = await storage.createSupplier(input);
    res.status(201).json(created);
  });

  // Customers
  app.get(api.customers.list.path, requireAuth, async (req, res) => {
    const input = api.customers.list.input?.parse(req.query) ?? {};
    const result = await storage.getCustomers(input);
    res.json(result);
  });

  app.get(api.customers.transactions.path, requireAuth, async (req, res) => {
    const input = api.customers.transactions.input?.parse(req.query) ?? {};
    const result = await storage.getCustomerTransactions(Number(req.params.id), input);
    if (!result) return res.status(404).json({ code: "NOT_FOUND", message: "Customer not found" });
    res.json(result);
  });

  app.get(api.customers.points.path, requireAuth, async (req, res) => {
    const input = api.customers.points.input?.parse(req.query) ?? {};
    const result = await storage.getCustomerPointHistory(Number(req.params.id), input);
    if (!result) return res.status(404).json({ code: "NOT_FOUND", message: "Customer not found" });
    res.json(result);
  });

  app.post(api.customers.create.path, requireAuth, async (req, res) => {
    const input = api.customers.create.input.parse(req.body);
    const customer = await storage.createCustomer(input);
    res.status(201).json(customer);
  });

  app.put(api.customers.update.path, requireAuth, async (req, res) => {
    const input = api.customers.update.input.parse(req.body);
    const updated = await storage.updateCustomer(Number(req.params.id), input);
    if (!updated) return res.status(404).json({ message: "Customer not found" });
    res.json(updated);
  });

  app.delete(api.customers.delete.path, requireAdmin, async (req, res) => {
    await storage.deleteCustomer(Number(req.params.id));
    res.sendStatus(204);
  });

  // Sales
  app.post(api.sales.checkout.path, requireAuth, requireActiveShift, async (req, res) => {
    try {
      const input = api.sales.checkout.input.parse(req.body);
      const user = req.user as any;
      const sale = await transactionService.checkout(input, user.id);
      res.status(201).json(sale);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(422).json({ code: "VALIDATION_ERROR", message: "Input tidak valid", details: err.issues });
      }
      if (err instanceof BusinessError) {
        return res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
      }
      console.error("sales_checkout_failed", { cashierId: (req.user as any)?.id, message: err?.message });
      res.status(500).json({ code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" });
    }
  });

  app.get(api.sales.list.path, requireAuth, async (req, res) => {
    const input = api.sales.list.input?.parse(req.query) ?? {};
    const user = req.user as any;
    const result = await transactionService.list(input, { userId: user.id, role: user.role });
    res.json(result);
  });

  app.get(api.sales.get.path, requireAuth, async (req, res) => {
    const sale = await transactionService.get(Number(req.params.id));
    if (!sale) return res.status(404).json({ message: "Sale not found" });
    res.json(sale);
  });

  app.delete(api.sales.delete.path, requireSupervisor, requireActiveShift, async (req, res) => {
    const sale = await transactionService.get(Number(req.params.id));
    if (!sale) return res.status(404).json({ message: "Sale not found" });
    
    await transactionService.void(Number(req.params.id), (req.user as any)?.id, Number((req.cashierShift as any)?.id));
    res.sendStatus(204);
  });

  app.post(api.suspendedSales.create.path, requireAuth, requireActiveShift, async (req, res) => {
    try {
      const input = api.suspendedSales.create.input.parse(req.body);
      if (!input.items?.length) return res.status(400).json({ message: "Cart is empty" });
      const user = req.user as any;
      const { note, ...data } = input;
      const created = await storage.createSuspendedSale(user.id, data, note);
      res.status(201).json(created);
    } catch (err: any) {
      console.error("suspended_sales_create_failed", { cashierId: (req.user as any)?.id, message: err?.message, stack: err?.stack });
      if (err?.code === "ER_NO_SUCH_TABLE") {
        return res.status(503).json({ message: "Tabel DB untuk transaksi ditunda belum ada. Jalankan: npm run db:push" });
      }
      res.status(400).json({ message: err.message || "Failed to suspend transaction" });
    }
  });

  app.get(api.suspendedSales.list.path, requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const items = await storage.getSuspendedSales(user.id);
      res.json(items);
    } catch (err: any) {
      if (err?.code === "ER_NO_SUCH_TABLE") {
        return res.status(503).json({ message: "Tabel DB untuk transaksi ditunda belum ada. Jalankan: npm run db:push" });
      }
      res.status(500).json({ message: err?.message || "Failed to load suspended transactions" });
    }
  });

  app.post(api.suspendedSales.recall.path, requireAuth, requireActiveShift, async (req, res) => {
    try {
      const user = req.user as any;
      const recalled = await storage.recallSuspendedSale(user.id, Number(req.params.id));
      if (!recalled) return res.status(404).json({ message: "Suspended transaction not found" });
      res.json(recalled);
    } catch (err: any) {
      console.error("suspended_sales_recall_failed", { cashierId: (req.user as any)?.id, id: req.params.id, message: err?.message, stack: err?.stack });
      if (err?.code === "ER_NO_SUCH_TABLE") {
        return res.status(503).json({ message: "Tabel DB untuk transaksi ditunda belum ada. Jalankan: npm run db:push" });
      }
      res.status(400).json({ message: err.message || "Failed to recall transaction" });
    }
  });

  // Returns
  app.post(api.returns.create.path, requireAuth, requireActiveShift, async (req, res) => {
    try {
      const input = api.returns.create.input.parse(req.body);
      const user = req.user as any;
      const shift = req.cashierShift as any;
      const ret = await returnService.create(input, { id: user.id, role: user.role }, Number(shift?.id));
      res.status(201).json(ret);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(422).json({ code: "VALIDATION_ERROR", message: "Input tidak valid", details: err.issues });
      }
      if (err instanceof BusinessError) {
        return res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
      }
      res.status(500).json({ code: "INTERNAL_ERROR", message: "Terjadi kesalahan server" });
    }
  });

  app.get(api.returns.list.path, requireAuth, async (req, res) => {
    const input = api.returns.list.input?.parse(req.query) ?? {};
    const actor = req.user as any;
    const result = await returnService.list(input, { userId: Number(actor?.id), role: String(actor?.role ?? "") });
    res.json(result);
  });

  app.delete(api.returns.delete.path, requireSupervisor, async (req, res) => {
    try {
      await returnService.cancel(Number(req.params.id), (req.user as any)?.id);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ message: "Failed to delete return" });
    }
  });

  // Discounts
  app.get(api.discounts.list.path, requireAuth, async (req, res) => {
    const input = api.discounts.list.input?.parse(req.query) ?? {};
    const result = await storage.getDiscounts(input);
    res.json(result);
  });

  app.get(api.discounts.get.path, requireAuth, async (req, res) => {
    const discount = await storage.getDiscount(Number(req.params.id));
    if (!discount) return res.status(404).json({ message: "Discount not found" });
    res.json(discount);
  });

  app.post(api.discounts.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.discounts.create.input.parse(req.body);
      const discount = await storage.createDiscount(input);
      res.status(201).json(discount);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: err.errors });
      }
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put(api.discounts.update.path, requireAdmin, async (req, res) => {
    try {
      const input = api.discounts.update.input.parse(req.body);
      const updated = await storage.updateDiscount(Number(req.params.id), input);
      if (!updated) return res.status(404).json({ message: "Discount not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: err.errors });
      }
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.discounts.delete.path, requireAdmin, async (req, res) => {
    await storage.deleteDiscount(Number(req.params.id));
    res.sendStatus(204);
  });

  app.get(api.loyalty.settings.get.path, requireAuth, async (_req, res) => {
    const settings = await loyaltyService.getSettings();
    res.json(settings);
  });

  app.put(api.loyalty.settings.update.path, requireAdmin, async (req, res) => {
    const input = api.loyalty.settings.update.input.parse(req.body);
    const updated = await loyaltyService.updateSettings(input);
    res.json(updated);
  });

  app.get(api.appSettings.get.path, requireAuth, async (_req, res) => {
    const settings = await storage.getAppSettings();
    res.json(settings);
  });

  app.put(api.appSettings.update.path, requireAdmin, async (req, res) => {
    const input = api.appSettings.update.input.parse(req.body);
    const updated = await storage.updateAppSettings({
      storeName: input.storeName,
      storeAddress: input.storeAddress ?? null,
      receiptFooter: input.receiptFooter ?? null,
    });
    res.json(updated);
  });

  app.get(api.reports.summary.path, requireManager, async (req, res) => {
    const input = api.reports.summary.input?.parse(req.query) ?? {};
    const result = await reportService.summary(input);
    res.json(result);
  });

  app.get(api.reports.daily.path, requireManager, async (req, res) => {
    const stats = await storage.getDailyStats();
    res.json(stats);
  });

  app.get(api.reports.sales.path, requireManager, async (req, res) => {
    const input = api.reports.sales.input?.parse(req.query) ?? {};
    const result = await reportService.sales(input);
    res.json(result);
  });

  app.get(api.reports.customers.path, requireManager, async (req, res) => {
    const input = api.reports.customers.input?.parse(req.query) ?? {};
    const result = await reportService.customers(input);
    res.json(result);
  });

  app.get(api.reports.products.path, requireManager, async (req, res) => {
    const input = api.reports.products.input?.parse(req.query) ?? {};
    const result = await reportService.products(input);
    res.json(result);
  });

  app.get(api.reports.returns.path, requireManager, async (req, res) => {
    const input = api.reports.returns.input?.parse(req.query) ?? {};
    const result = await reportService.returns(input);
    res.json(result);
  });

  app.get(api.reports.items.path, requireManager, async (req, res) => {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const brandId = req.query.brandId ? Number(req.query.brandId) : undefined;

    const stats = await reportService.items({
      startDate: startDate && !Number.isNaN(startDate.getTime()) ? startDate.toISOString() : undefined,
      endDate: endDate && !Number.isNaN(endDate.getTime()) ? endDate.toISOString() : undefined,
      brandId,
    });
    res.json(stats);
  });

  // === INITIALIZATION ROUTES (v1.0.0 PRODUCTION) ===
  app.get("/api/init/check", async (_req, res) => {
    const isFresh = await InitializationService.isSystemFresh();
    const info = await InitializationService.getSystemInfo();
    res.json({ isFresh, info });
  });

  app.post("/api/init/setup", async (_req, res) => {
    const result = await InitializationService.ensureDefaultAdmin();
    if (result.created) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  });

  // === SYSTEM INFO ROUTES ===
  app.get("/api/system/info", requireAuth, async (_req, res) => {
    const info = await InitializationService.getSystemInfo();
    const latestBackup = await BackupService.getLatestBackupInfo();
    res.json({
      ...info,
      lastBackup: latestBackup,
    });
  });

  // === BACKUP & RESTORE ROUTES ===
  app.post("/api/backup/create", requireAdmin, async (req, res) => {
    const result = await BackupService.createBackup();
    if (result.success) {
      res.status(201).json(result);
      // Clean up old backups in background
      BackupService.cleanupOldBackups().catch(err => 
        console.error("Error cleaning old backups:", err)
      );
    } else {
      res.status(500).json(result);
    }
  });

  app.get("/api/backup/list", requireAdmin, async (_req, res) => {
    const backups = await BackupService.listBackups();
    res.json(backups);
  });

  app.get("/api/backup/latest", requireAdmin, async (_req, res) => {
    const backup = await BackupService.getLatestBackupInfo();
    res.json(backup);
  });

  app.post("/api/backup/restore", requireAdmin, async (req, res) => {
    const { fileName } = req.body;
    if (!fileName) {
      return res.status(400).json({ success: false, message: "File name required" });
    }
    const result = await BackupService.restoreBackup(fileName);
    res.json(result);
  });

  // Seed Data (if empty and development only)
  await seed();

  return httpServer;
}

async function seed() {
  // Only seed in development mode
  if (process.env.NODE_ENV !== "development") {
    // In production, ensure default admin exists
    const result = await InitializationService.ensureDefaultAdmin();
    if (result.created) {
      console.log("✓ Default admin account created for fresh installation");
    }
    return;
  }

  const existingUser = await storage.getUserByUsername("admin");
  if (!existingUser) {
    const password = await hashPassword("admin123");
    await storage.createUser({ 
      username: "admin", 
      password, 
      fullName: "System Admin", 
      role: "admin" 
    });
    
    const supervisorPwd = await hashPassword("supervisor123");
    await storage.createUser({
      username: "supervisor",
      password: supervisorPwd,
      fullName: "Shift Supervisor",
      role: "supervisor",
    });

    const cashierPwd = await hashPassword("cashier123");
    await storage.createUser({ 
      username: "cashier", 
      password: cashierPwd, 
      fullName: "Jane Doe", 
      role: "cashier" 
    });

    const category = await storage.createCategory({ name: "Frozen Food" });
    const snackCategory = await storage.createCategory({ name: "Snacks" });
    const supplier = await storage.createSupplier({ name: "Pemasok Utama" });

    const brand = await storage.createBrand({ name: "Cedea", categoryId: category.id });
    await storage.createBrand({ name: "Indofood", categoryId: snackCategory.id });

    await storage.createProduct({
      barcode: "8991234567890",
      name: "Cedea Fish Dumpling Cheese 500g",
      brandId: brand.id,
      categoryId: category.id,
      supplierId: supplier.id,
      price: "35000",
      stock: 50,
      description: "Frozen food best seller"
    });

    await storage.createProduct({
      barcode: "12345",
      name: "Indomie Goreng",
      brandId: 2,
      categoryId: snackCategory.id,
      supplierId: supplier.id,
      price: "3500",
      stock: 100,
      description: "Mie instan"
    });

    await storage.createCustomer({
      name: "Budi Santoso",
      phone: "08123456789",
      totalPoints: 10
    });
  }
}
