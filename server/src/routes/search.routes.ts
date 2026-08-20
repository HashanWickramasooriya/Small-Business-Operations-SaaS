import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireBusiness } from "../middleware/tenant";
import { prisma } from "../lib/prisma";
import { canAccessModule } from "../lib/permissions";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireBusiness);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = ((req.query.q as string) || "").trim();
    if (q.length < 2) return res.json({ products: [], customers: [], suppliers: [], sales: [], employees: [] });

    const businessId = req.businessId!;
    const role = req.role!;
    const contains = { contains: q, mode: "insensitive" as const };

    const [products, customers, suppliers, sales, employees] = await Promise.all([
      canAccessModule(role, "products")
        ? prisma.product.findMany({ where: { businessId, OR: [{ name: contains }, { sku: contains }] }, take: 5 })
        : [],
      canAccessModule(role, "customers")
        ? prisma.customer.findMany({ where: { businessId, OR: [{ name: contains }, { phone: contains }] }, take: 5 })
        : [],
      canAccessModule(role, "suppliers")
        ? prisma.supplier.findMany({ where: { businessId, name: contains }, take: 5 })
        : [],
      canAccessModule(role, "sales")
        ? prisma.sale.findMany({ where: { businessId, reference: contains }, take: 5 })
        : [],
      canAccessModule(role, "employees")
        ? prisma.membership.findMany({
            where: { businessId, user: { OR: [{ fullName: contains }, { email: contains }] } },
            include: { user: { select: { fullName: true, email: true } } },
            take: 5,
          })
        : [],
    ]);

    res.json({ products, customers, suppliers, sales, employees });
  })
);

export default router;
