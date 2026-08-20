import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireBusiness, requireModule } from "../middleware/tenant";
import * as SaleController from "../controllers/sale.controller";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireBusiness, requireModule("sales"));

router.get("/", asyncHandler(SaleController.listSales));
router.get("/:saleId", asyncHandler(SaleController.getSale));
router.post("/", requireModule("pos", "write"), asyncHandler(SaleController.createSale));
router.post("/:saleId/refund", requireModule("pos", "write"), asyncHandler(SaleController.refundSale));

export default router;
