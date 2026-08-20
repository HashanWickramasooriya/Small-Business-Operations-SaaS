import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireBusiness, requireModule } from "../middleware/tenant";
import * as PurchaseController from "../controllers/purchase.controller";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireBusiness, requireModule("purchases"));

router.get("/", asyncHandler(PurchaseController.listPurchases));
router.get("/:purchaseId", asyncHandler(PurchaseController.getPurchase));
router.post("/", requireModule("purchases", "write"), asyncHandler(PurchaseController.createPurchase));
router.patch("/:purchaseId/status", requireModule("purchases", "write"), asyncHandler(PurchaseController.updatePurchaseStatus));
router.post("/:purchaseId/receive", requireModule("purchases", "write"), asyncHandler(PurchaseController.receivePurchase));

export default router;
