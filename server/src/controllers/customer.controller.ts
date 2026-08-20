import { Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";
import { logActivity } from "../services/activityLog.service";

const customerSchema = z.object({
  name: z.string().min(1).max(150),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export async function listCustomers(req: Request, res: Response) {
  const search = (req.query.search as string) || "";
  const page = Number(req.query.page ?? 1);
  const pageSize = Math.min(Number(req.query.pageSize ?? 20), 100);

  const where: Prisma.CustomerWhereInput = {
    businessId: req.businessId,
    ...(search
      ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }, { email: { contains: search, mode: "insensitive" } }] }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.customer.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.customer.count({ where }),
  ]);

  res.json({ items, total, page, pageSize });
}

export async function getCustomer(req: Request, res: Response) {
  const customer = await prisma.customer.findFirst({ where: { id: req.params.customerId, businessId: req.businessId } });
  if (!customer) throw ApiError.notFound("Customer not found");

  const sales = await prisma.sale.findMany({
    where: { businessId: req.businessId, customerId: customer.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { items: true },
  });

  const totals = await prisma.sale.aggregate({
    where: { businessId: req.businessId, customerId: customer.id, status: { not: "VOID" } },
    _sum: { total: true },
    _count: true,
  });

  res.json({
    customer,
    recentSales: sales,
    summary: { totalSpent: totals._sum.total ?? 0, orderCount: totals._count },
  });
}

export async function createCustomer(req: Request, res: Response) {
  const input = customerSchema.parse(req.body);
  const customer = await prisma.customer.create({
    data: {
      businessId: req.businessId!,
      name: input.name,
      email: input.email || undefined,
      phone: input.phone || undefined,
      address: input.address || undefined,
      notes: input.notes || undefined,
    },
  });
  await logActivity({ businessId: req.businessId!, userId: req.userId, action: "customer.created", entityType: "Customer", entityId: customer.id });
  res.status(201).json({ customer });
}

export async function updateCustomer(req: Request, res: Response) {
  const input = customerSchema.partial().parse(req.body);
  const existing = await prisma.customer.findFirst({ where: { id: req.params.customerId, businessId: req.businessId } });
  if (!existing) throw ApiError.notFound("Customer not found");

  const customer = await prisma.customer.update({
    where: { id: existing.id },
    data: { ...input, email: input.email || undefined, phone: input.phone || undefined },
  });
  res.json({ customer });
}

export async function deleteCustomer(req: Request, res: Response) {
  const existing = await prisma.customer.findFirst({ where: { id: req.params.customerId, businessId: req.businessId } });
  if (!existing) throw ApiError.notFound("Customer not found");
  await prisma.customer.delete({ where: { id: existing.id } });
  res.status(204).send();
}
