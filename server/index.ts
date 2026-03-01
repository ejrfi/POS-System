import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { ensureAppSettingsTable, ensureAuditLogsTable, ensureCashierShiftSnapshotColumns, ensureCashierShiftsTable, ensureCustomerMembershipSchema, ensureDiscountsSchema, ensureEnterpriseInventorySchema, ensureMultiUnitColumns, ensureProductPriceAuditsTable, ensureReturnRefundMethodColumn, ensureReturnsEnhancementsSchema, ensureSalesShiftIdColumn, ensureSalesStatusColumns, ensureShiftReportsSchema, ensureSuspendedSalesTable } from "./db";

const app = express();
console.log("Starting server...");
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "50mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "50mb" }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  console.log("PORT FROM ENV:", process.env.PORT);

  const PORT = process.env.PORT;
  if (!PORT) {
    throw new Error("PORT environment variable not found. Railway MUST inject this.");
  }

  // 1. Health check endpoint (Placed at the very top to ensure availability)
  app.get("/health", (_, res) => {
    res.status(200).send("OK");
  });

  // Debug root endpoint
  app.get("/", (_, res) => {
    res.send("SERVER RUNNING");
  });

  // 2. Start listening IMMEDIATELY
  httpServer.listen(Number(PORT), "0.0.0.0", () => {
    log(`Server running on port ${PORT}`);
  });

  // 3. Run Database Setup & Route Registration in Background
  (async () => {
    try {
      console.log("Starting background initialization...");
      console.log("Registering routes...");
      await ensureMultiUnitColumns();
      await ensureProductPriceAuditsTable();
      await ensureSuspendedSalesTable();
      await ensureCashierShiftsTable();
      await ensureCashierShiftSnapshotColumns();
      await ensureSalesShiftIdColumn();
      await ensureSalesStatusColumns();
      await ensureReturnRefundMethodColumn();
      await ensureReturnsEnhancementsSchema();
      await ensureShiftReportsSchema();
      await ensureAuditLogsTable();
      await ensureAppSettingsTable();
      await ensureDiscountsSchema();
      await ensureEnterpriseInventorySchema();
      await ensureCustomerMembershipSchema();
      await registerRoutes(httpServer, app);
      console.log("Routes registered.");

      // Global error handler
      app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";

        console.error("Internal Server Error:", err);

        if (res.headersSent) {
          return next(err);
        }

        return res.status(status).json({ message });
      });

      // importantly only setup vite in development and after
      // setting up all the other routes so the catch-all route
      // doesn't interfere with the other routes
      if (process.env.NODE_ENV === "production") {
        serveStatic(app);
      } else {
        const { setupVite } = await import("./vite");
        await setupVite(httpServer, app);
      }
      console.log("Background initialization complete.");
    } catch (err) {
      console.error("Startup background error:", err);
    }
  })();

})().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
