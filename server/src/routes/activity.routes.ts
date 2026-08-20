import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireBusiness, requireModule } from "../middleware/tenant";
import { prisma } from "../lib/prisma";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireBusiness, requireModule("activity"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page ?? 1);
    const pageSize = Math.min(Number(req.query.pageSize ?? 30), 100);
    const entityType = req.query.entityType as string | undefined;

    const where = { businessId: req.businessId, entityType: entityType || undefined };
    const [items, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: { user: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({ items, total, page, pageSize });
  })
);

export default router;
