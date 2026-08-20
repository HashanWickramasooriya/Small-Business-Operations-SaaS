import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { resolveDateRange, DatePreset } from "../utils/dateRange";

function range(req: Request) {
  return resolveDateRange(
    req.query.preset as DatePreset | undefined,
    req.query.from as string | undefined,
    req.query.to as string | undefined
  );
}

export async function salesReport(req: Request, res: Response) {
  const { gte, lte } = range(req);
  const where = { businessId: req.businessId, createdAt: { gte, lte }, status: { not: "VOID" as const } };

  const [agg, byDay, sales] = await Promise.all([
    prisma.sale.aggregate({ where, _sum: { total: true, subtotal: true, tax: true, discount: true }, _count: true }),
    prisma.$queryRaw<{ day: Date; total: number }[]>`
      SELECT date_trunc('day', "createdAt") as day, SUM(total)::float as total
      FROM "Sale" WHERE "businessId" = ${req.businessId} AND "createdAt" BETWEEN ${gte} AND ${lte} AND status != 'VOID'
      GROUP BY day ORDER BY day ASC
    `,
    prisma.sale.findMany({ where, include: { items: true, customer: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
  ]);

  res.json({
    summary: {
      totalRevenue: agg._sum.total ?? 0,
      totalOrders: agg._count,
      totalTax: agg._sum.tax ?? 0,
      totalDiscount: agg._sum.discount ?? 0,
    },
    byDay,
    sales,
  });
}

export async function revenueReport(req: Request, res: Response) {
  const { gte, lte } = range(req);
  const [revenue, expenses] = await Promise.all([
    prisma.sale.aggregate({ where: { businessId: req.businessId, createdAt: { gte, lte }, status: { not: "VOID" } }, _sum: { total: true } }),
    prisma.expense.aggregate({ where: { businessId: req.businessId, date: { gte, lte } }, _sum: { amount: true } }),
  ]);

  const totalRevenue = Number(revenue._sum.total ?? 0);
  const totalExpenses = Number(expenses._sum.amount ?? 0);

  res.json({
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
  });
}

export async function inventoryReport(req: Request, res: Response) {
  const products = await prisma.product.findMany({
    where: { businessId: req.businessId, status: "ACTIVE" },
    select: { id: true, name: true, sku: true, stock: true, minStock: true, purchasePrice: true, sellingPrice: true },
    orderBy: { stock: "asc" },
  });

  const stockValue = products.reduce((sum, p) => sum + p.stock * Number(p.purchasePrice), 0);
  const lowStock = products.filter((p) => p.stock <= p.minStock);

  res.json({ products, stockValue, lowStockCount: lowStock.length, lowStock });
}

export async function productPerformanceReport(req: Request, res: Response) {
  const { gte, lte } = range(req);
  const rows = await prisma.$queryRaw<
    { productId: string; name: string; sku: string; totalQuantity: number; totalRevenue: number }[]
  >`
    SELECT si."productId", p.name, p.sku,
      SUM(si.quantity)::int as "totalQuantity",
      SUM(si.total)::float as "totalRevenue"
    FROM "SaleItem" si
    JOIN "Sale" s ON s.id = si."saleId"
    JOIN "Product" p ON p.id = si."productId"
    WHERE s."businessId" = ${req.businessId} AND s."createdAt" BETWEEN ${gte} AND ${lte} AND s.status != 'VOID'
    GROUP BY si."productId", p.name, p.sku
    ORDER BY "totalRevenue" DESC
    LIMIT 50
  `;
  res.json({ items: rows });
}

export async function customerReport(req: Request, res: Response) {
  const { gte, lte } = range(req);
  const rows = await prisma.$queryRaw<
    { customerId: string; name: string; orders: number; totalSpent: number }[]
  >`
    SELECT c.id as "customerId", c.name, COUNT(s.id)::int as orders, COALESCE(SUM(s.total), 0)::float as "totalSpent"
    FROM "Customer" c
    LEFT JOIN "Sale" s ON s."customerId" = c.id AND s."createdAt" BETWEEN ${gte} AND ${lte} AND s.status != 'VOID'
    WHERE c."businessId" = ${req.businessId}
    GROUP BY c.id, c.name
    ORDER BY "totalSpent" DESC
    LIMIT 100
  `;
  res.json({ items: rows });
}

export async function expenseReport(req: Request, res: Response) {
  const { gte, lte } = range(req);
  const [byCategory, total] = await Promise.all([
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: { businessId: req.businessId, date: { gte, lte } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({ where: { businessId: req.businessId, date: { gte, lte } }, _sum: { amount: true } }),
  ]);

  const categories = await prisma.expenseCategory.findMany({ where: { businessId: req.businessId } });
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  res.json({
    total: total._sum.amount ?? 0,
    byCategory: byCategory.map((b) => ({
      categoryId: b.categoryId,
      categoryName: categoryMap.get(b.categoryId) ?? "Unknown",
      amount: b._sum.amount ?? 0,
    })),
  });
}

export async function employeeActivityReport(req: Request, res: Response) {
  const { gte, lte } = range(req);
  const logs = await prisma.activityLog.findMany({
    where: { businessId: req.businessId, createdAt: { gte, lte } },
    include: { user: { select: { fullName: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  res.json({ items: logs });
}
