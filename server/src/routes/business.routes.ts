import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireBusiness, requireModule, requireRole } from "../middleware/tenant";
import * as BusinessController from "../controllers/business.controller";
import { Role } from "@prisma/client";

const router = Router();

router.use(requireAuth);

// Creating a business does not require existing tenant context.
router.post("/", asyncHandler(BusinessController.createBusiness));

// Everything below operates on :businessId and is tenant-scoped.
router.get("/:businessId", requireBusiness, asyncHandler(BusinessController.getBusiness));
router.patch(
  "/:businessId",
  requireBusiness,
  requireModule("settings", "write"),
  asyncHandler(BusinessController.updateBusiness)
);
router.patch("/:businessId/onboarding", requireBusiness, asyncHandler(BusinessController.updateOnboarding));

router.get("/:businessId/members", requireBusiness, requireModule("employees"), asyncHandler(BusinessController.listMembers));
router.post(
  "/:businessId/members",
  requireBusiness,
  requireRole(Role.OWNER, Role.MANAGER),
  asyncHandler(BusinessController.inviteMember)
);
router.patch(
  "/:businessId/members/:memberId",
  requireBusiness,
  requireRole(Role.OWNER),
  asyncHandler(BusinessController.updateMemberRole)
);
router.delete(
  "/:businessId/members/:memberId",
  requireBusiness,
  requireRole(Role.OWNER),
  asyncHandler(BusinessController.removeMember)
);

export default router;
