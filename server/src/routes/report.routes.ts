import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireBusiness, requireModule } from "../middleware/tenant";
import * as ReportController from "../controllers/report.controller";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireBusiness, requireModule("reports"));

router.get("/sales", asyncHandler(ReportController.salesReport));
router.get("/revenue", asyncHandler(ReportController.revenueReport));
router.get("/inventory", asyncHandler(ReportController.inventoryReport));
router.get("/product-performance", asyncHandler(ReportController.productPerformanceReport));
router.get("/customers", asyncHandler(ReportController.customerReport));
router.get("/expenses", asyncHandler(ReportController.expenseReport));
router.get("/employee-activity", asyncHandler(ReportController.employeeActivityReport));

export default router;
