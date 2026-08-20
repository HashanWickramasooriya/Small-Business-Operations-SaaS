import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireBusiness, requireModule } from "../middleware/tenant";
import * as CategoryController from "../controllers/category.controller";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireBusiness, requireModule("products"));

router.get("/", asyncHandler(CategoryController.listCategories));
router.post("/", requireModule("products", "write"), asyncHandler(CategoryController.createCategory));
router.delete("/:categoryId", requireModule("products", "write"), asyncHandler(CategoryController.deleteCategory));

export default router;
