import { Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";
import { logActivity } from "../services/activityLog.service";

const supplierSchema = z.object({
  name: z.string().min(1).max(150),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export async function listSuppliers(req: Request, res: Response) {
  const search = (req.query.search as string) || "";
  const where: Prisma.SupplierWhereInput = {
    businessId: req.businessId,
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
  };
  const suppliers = await prisma.supplier.findMany({ where, orderBy: { name: "asc" } });
  res.json({ items: suppliers });
}

export async function getSupplier(req: Request, res: Response) {
  const supplier = await prisma.supplier.findFirst({ where: { id: req.params.supplierId, businessId: req.businessId } });
  if (!supplier) throw ApiError.notFound("Supplier not found");

  const [products, purchases] = await Promise.all([
    prisma.product.findMany({ where: { businessId: req.businessId, supplierId: supplier.id }, select: { id: true, name: true, sku: true, stock: true } }),
    prisma.purchase.findMany({ where: { businessId: req.businessId, supplierId: supplier.id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  res.json({ supplier, products, purchases });
}

export async function createSupplier(req: Request, res: Response) {
  const input = supplierSchema.parse(req.body);
  const supplier = await prisma.supplier.create({
    data: { businessId: req.businessId!, name: input.name, email: input.email || undefined, phone: input.phone || undefined, address: input.address || undefined, notes: input.notes || undefined },
  });
  await logActivity({ businessId: req.businessId!, userId: req.userId, action: "supplier.created", entityType: "Supplier", entityId: supplier.id });
  res.status(201).json({ supplier });
}

export async function updateSupplier(req: Request, res: Response) {
  const input = supplierSchema.partial().parse(req.body);
  const existing = await prisma.supplier.findFirst({ where: { id: req.params.supplierId, businessId: req.businessId } });
  if (!existing) throw ApiError.notFound("Supplier not found");
  const supplier = await prisma.supplier.update({ where: { id: existing.id }, data: { ...input, email: input.email || undefined } });
  res.json({ supplier });
}

export async function deleteSupplier(req: Request, res: Response) {
  const existing = await prisma.supplier.findFirst({ where: { id: req.params.supplierId, businessId: req.businessId } });
  if (!existing) throw ApiError.notFound("Supplier not found");
  await prisma.supplier.delete({ where: { id: existing.id } });
  res.status(204).send();
}
