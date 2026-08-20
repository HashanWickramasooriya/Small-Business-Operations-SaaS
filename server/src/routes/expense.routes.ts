import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireBusiness, requireModule } from "../middleware/tenant";
import * as ExpenseController from "../controllers/expense.controller";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireBusiness, requireModule("expenses"));

router.get("/categories", asyncHandler(ExpenseController.listExpenseCategories));
router.get("/", asyncHandler(ExpenseController.listExpenses));
router.post("/", requireModule("expenses", "write"), asyncHandler(ExpenseController.createExpense));
router.patch("/:expenseId", requireModule("expenses", "write"), asyncHandler(ExpenseController.updateExpense));
router.delete("/:expenseId", requireModule("expenses", "write"), asyncHandler(ExpenseController.deleteExpense));

export default router;
