
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import MemoryStore from "memorystore";

const scryptAsync = promisify(scrypt);
const SessionStore = MemoryStore(session);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePassword(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // === AUTH SETUP ===
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "pos_secret_key",
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 86400000 }, // 1 day
      store: new SessionStore({ checkPeriod: 86400000 }),
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePassword(password, user.password))) {
          return done(null, false);
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Middleware to protect routes
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ message: "Unauthorized" });
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    if (req.isAuthenticated() && req.user.role === "admin") return next();
    res.status(403).json({ message: "Forbidden: Admin access required" });
  };

  // === AUTH ROUTES ===
  app.post(api.auth.login.path, passport.authenticate("local"), (req, res) => {
    res.json(req.user);
  });

  app.post(api.auth.logout.path, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // === API ROUTES ===

  // Products
  app.get(api.products.list.path, requireAuth, async (req, res) => {
    const search = req.query.search as string | undefined;
    const brandId = req.query.brandId ? Number(req.query.brandId) : undefined;
    const products = await storage.getProducts(search, brandId);
    res.json(products);
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
    const updated = await storage.updateProduct(Number(req.params.id), input);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.delete(api.products.delete.path, requireAdmin, async (req, res) => {
    await storage.deleteProduct(Number(req.params.id));
    res.sendStatus(204);
  });

  // Brands
  app.get(api.brands.list.path, requireAuth, async (req, res) => {
    const brands = await storage.getBrands();
    res.json(brands);
  });

  app.post(api.brands.create.path, requireAdmin, async (req, res) => {
    const input = api.brands.create.input.parse(req.body);
    const brand = await storage.createBrand(input);
    res.status(201).json(brand);
  });

  // Customers
  app.get(api.customers.list.path, requireAuth, async (req, res) => {
    const search = req.query.search as string | undefined;
    const customers = await storage.getCustomers(search);
    res.json(customers);
  });

  app.post(api.customers.create.path, requireAuth, async (req, res) => {
    const input = api.customers.create.input.parse(req.body);
    const customer = await storage.createCustomer(input);
    res.status(201).json(customer);
  });

  // Sales
  app.post(api.sales.checkout.path, requireAuth, async (req, res) => {
    try {
      const input = api.sales.checkout.input.parse(req.body);
      const user = req.user as any;
      const sale = await storage.createSale(input, user.id);
      res.status(201).json(sale);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Transaction failed" });
    }
  });

  app.get(api.sales.list.path, requireAdmin, async (req, res) => {
    const sales = await storage.getSales();
    res.json(sales);
  });

  app.get(api.reports.daily.path, requireAdmin, async (req, res) => {
    const stats = await storage.getDailyStats();
    res.json(stats);
  });

  // Seed Data (if empty)
  await seed();

  return httpServer;
}

async function seed() {
  const existingUser = await storage.getUserByUsername("admin");
  if (!existingUser) {
    const password = await hashPassword("admin123");
    await storage.createUser({ 
      username: "admin", 
      password, 
      fullName: "System Admin", 
      role: "admin" 
    });
    
    const cashierPwd = await hashPassword("cashier123");
    await storage.createUser({ 
      username: "cashier", 
      password: cashierPwd, 
      fullName: "Jane Doe", 
      role: "cashier" 
    });

    const brand = await storage.createBrand({ name: "Cedea" });
    await storage.createBrand({ name: "Indofood" });

    await storage.createProduct({
      barcode: "8991234567890",
      name: "Cedea Fish Dumpling Cheese 500g",
      brandId: brand.id,
      price: "35000",
      stock: 50,
      description: "Frozen food best seller"
    });

    await storage.createProduct({
      barcode: "12345",
      name: "Indomie Goreng",
      brandId: 2,
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
