import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireBusiness, requireModule } from "../middleware/tenant";
import * as ProductController from "../controllers/product.controller";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireBusiness, requireModule("products"));

router.get("/", asyncHandler(ProductController.listProducts));
router.post("/import", requireModule("products", "write"), asyncHandler(ProductController.bulkImportProducts));
router.get("/:productId", asyncHandler(ProductController.getProduct));
router.post("/", requireModule("products", "write"), asyncHandler(ProductController.createProduct));
router.patch("/:productId", requireModule("products", "write"), asyncHandler(ProductController.updateProduct));
router.post("/:productId/archive", requireModule("products", "write"), asyncHandler(ProductController.archiveProduct));

export default router;
