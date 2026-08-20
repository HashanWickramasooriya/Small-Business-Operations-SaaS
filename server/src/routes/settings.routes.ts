import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireBusiness, requireModule } from "../middleware/tenant";
import { prisma } from "../lib/prisma";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireBusiness, requireModule("settings"));

const settingsSchema = z.object({
  invoicePrefix: z.string().max(10).optional(),
  receiptFooter: z.string().max(500).optional(),
  numberFormat: z.string().optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  notifyLowStock: z.boolean().optional(),
  notifyLargeExpense: z.boolean().optional(),
  largeExpenseThreshold: z.number().min(0).optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const settings = await prisma.businessSettings.upsert({
      where: { businessId: req.businessId },
      update: {},
      create: { businessId: req.businessId! },
    });
    res.json({ settings });
  })
);

router.patch(
  "/",
  requireModule("settings", "write"),
  asyncHandler(async (req, res) => {
    const input = settingsSchema.parse(req.body);
    const settings = await prisma.businessSettings.update({ where: { businessId: req.businessId }, data: input });
    res.json({ settings });
  })
);

export default router;
