import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireBusiness, requireModule } from "../middleware/tenant";
import * as InventoryController from "../controllers/inventory.controller";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireBusiness, requireModule("inventory"));

router.get("/movements", asyncHandler(InventoryController.listMovements));
router.get("/low-stock", asyncHandler(InventoryController.listLowStock));
router.post("/adjust", requireModule("inventory", "write"), asyncHandler(InventoryController.adjustStock));

export default router;
