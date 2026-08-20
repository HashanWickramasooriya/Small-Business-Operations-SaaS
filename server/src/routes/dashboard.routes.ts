import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireBusiness, requireModule } from "../middleware/tenant";
import { prisma } from "../lib/prisma";
import { resolveDateRange } from "../utils/dateRange";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireBusiness, requireModule("dashboard"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const businessId = req.businessId!;
    const today = resolveDateRange("today");
    const last7 = resolveDateRange("last7days");
    const thisMonth = resolveDateRange("thisMonth");

    const [
      todaySales,
      todayExpenses,
      monthRevenue,
      monthExpenses,
      lowStockCount,
      outstandingAgg,
      salesByDay,
      topProducts,
      salesByCategory,
      paymentMethods,
    ] = await Promise.all([
      prisma.sale.aggregate({
        where: { businessId, createdAt: { gte: today.gte, lte: today.lte }, status: { not: "VOID" } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.expense.aggregate({ where: { businessId, date: { gte: today.gte, lte: today.lte } }, _sum: { amount: true } }),
      prisma.sale.aggregate({
        where: { businessId, createdAt: { gte: thisMonth.gte, lte: thisMonth.lte }, status: { not: "VOID" } },
        _sum: { total: true },
      }),
      prisma.expense.aggregate({ where: { businessId, date: { gte: thisMonth.gte, lte: thisMonth.lte } }, _sum: { amount: true } }),
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM "Product" WHERE "businessId" = ${businessId} AND status = 'ACTIVE' AND stock <= "minStock"
      `,
      prisma.customer.aggregate({ where: { businessId }, _sum: { outstandingBalance: true } }),
      prisma.$queryRaw<{ day: Date; total: number }[]>`
        SELECT date_trunc('day', "createdAt") as day, SUM(total)::float as total
        FROM "Sale" WHERE "businessId" = ${businessId} AND "createdAt" BETWEEN ${last7.gte} AND ${last7.lte} AND status != 'VOID'
        GROUP BY day ORDER BY day ASC
      `,
      prisma.$queryRaw<{ name: string; quantity: number }[]>`
        SELECT p.name, SUM(si.quantity)::int as quantity
        FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId" JOIN "Product" p ON p.id = si."productId"
        WHERE s."businessId" = ${businessId} AND s."createdAt" BETWEEN ${thisMonth.gte} AND ${thisMonth.lte} AND s.status != 'VOID'
        GROUP BY p.name ORDER BY quantity DESC LIMIT 5
      `,
      prisma.$queryRaw<{ category: string; total: number }[]>`
        SELECT COALESCE(c.name, 'Uncategorized') as category, SUM(si.total)::float as total
        FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId" JOIN "Product" p ON p.id = si."productId"
        LEFT JOIN "Category" c ON c.id = p."categoryId"
        WHERE s."businessId" = ${businessId} AND s."createdAt" BETWEEN ${thisMonth.gte} AND ${thisMonth.lte} AND s.status != 'VOID'
        GROUP BY c.name ORDER BY total DESC LIMIT 8
      `,
      prisma.sale.groupBy({
        by: ["paymentMethod"],
        where: { businessId, createdAt: { gte: thisMonth.gte, lte: thisMonth.lte }, status: { not: "VOID" } },
        _sum: { total: true },
      }),
    ]);

    const revenue = Number(monthRevenue._sum.total ?? 0);
    const expenses = Number(monthExpenses._sum.amount ?? 0);

    res.json({
      cards: {
        todaySales: todaySales._sum.total ?? 0,
        todayOrders: todaySales._count,
        todayExpenses: todayExpenses._sum.amount ?? 0,
        monthRevenue: revenue,
        monthExpenses: expenses,
        netProfit: revenue - expenses,
        lowStockProducts: Number(lowStockCount[0]?.count ?? 0),
        outstandingPayments: outstandingAgg._sum.outstandingBalance ?? 0,
      },
      charts: {
        salesByDay,
        topProducts,
        salesByCategory,
        paymentMethods: paymentMethods.map((p) => ({ method: p.paymentMethod, total: p._sum.total ?? 0 })),
      },
    });
  })
);

export default router;
