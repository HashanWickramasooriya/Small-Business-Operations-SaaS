import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireBusiness, requireModule } from "../middleware/tenant";
import * as CustomerController from "../controllers/customer.controller";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireBusiness, requireModule("customers"));

router.get("/", asyncHandler(CustomerController.listCustomers));
router.get("/:customerId", asyncHandler(CustomerController.getCustomer));
router.post("/", requireModule("customers", "write"), asyncHandler(CustomerController.createCustomer));
router.patch("/:customerId", requireModule("customers", "write"), asyncHandler(CustomerController.updateCustomer));
router.delete("/:customerId", requireModule("customers", "write"), asyncHandler(CustomerController.deleteCustomer));

export default router;
