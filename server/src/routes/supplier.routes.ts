import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireBusiness, requireModule } from "../middleware/tenant";
import * as SupplierController from "../controllers/supplier.controller";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireBusiness, requireModule("suppliers"));

router.get("/", asyncHandler(SupplierController.listSuppliers));
router.get("/:supplierId", asyncHandler(SupplierController.getSupplier));
router.post("/", requireModule("suppliers", "write"), asyncHandler(SupplierController.createSupplier));
router.patch("/:supplierId", requireModule("suppliers", "write"), asyncHandler(SupplierController.updateSupplier));
router.delete("/:supplierId", requireModule("suppliers", "write"), asyncHandler(SupplierController.deleteSupplier));

export default router;
