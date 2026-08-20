import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

import authRoutes from "./routes/auth.routes";
import businessRoutes from "./routes/business.routes";
import productRoutes from "./routes/product.routes";
import categoryRoutes from "./routes/category.routes";
import inventoryRoutes from "./routes/inventory.routes";
import customerRoutes from "./routes/customer.routes";
import supplierRoutes from "./routes/supplier.routes";
import purchaseRoutes from "./routes/purchase.routes";
import saleRoutes from "./routes/sale.routes";
import expenseRoutes from "./routes/expense.routes";
import reportRoutes from "./routes/report.routes";
import activityRoutes from "./routes/activity.routes";
import notificationRoutes from "./routes/notification.routes";
import settingsRoutes from "./routes/settings.routes";
import searchRoutes from "./routes/search.routes";
import dashboardRoutes from "./routes/dashboard.routes";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.appUrl,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  if (env.nodeEnv !== "test") {
    app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
  }

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 50,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.get("/api/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

  app.use("/api/auth", authLimiter, authRoutes);
  app.use("/api/businesses", apiLimiter, businessRoutes);
  app.use("/api/businesses/:businessId/products", apiLimiter, productRoutes);
  app.use("/api/businesses/:businessId/categories", apiLimiter, categoryRoutes);
  app.use("/api/businesses/:businessId/inventory", apiLimiter, inventoryRoutes);
  app.use("/api/businesses/:businessId/customers", apiLimiter, customerRoutes);
  app.use("/api/businesses/:businessId/suppliers", apiLimiter, supplierRoutes);
  app.use("/api/businesses/:businessId/purchases", apiLimiter, purchaseRoutes);
  app.use("/api/businesses/:businessId/sales", apiLimiter, saleRoutes);
  app.use("/api/businesses/:businessId/expenses", apiLimiter, expenseRoutes);
  app.use("/api/businesses/:businessId/reports", apiLimiter, reportRoutes);
  app.use("/api/businesses/:businessId/activity", apiLimiter, activityRoutes);
  app.use("/api/businesses/:businessId/notifications", apiLimiter, notificationRoutes);
  app.use("/api/businesses/:businessId/settings", apiLimiter, settingsRoutes);
  app.use("/api/businesses/:businessId/search", apiLimiter, searchRoutes);
  app.use("/api/businesses/:businessId/dashboard", apiLimiter, dashboardRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
