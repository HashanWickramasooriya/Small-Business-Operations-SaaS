import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";
import { recordInventoryMovement } from "../services/inventory.service";
import { logActivity } from "../services/activityLog.service";

const adjustmentSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().refine((v) => v !== 0, "Quantity cannot be zero"),
  note: z.string().max(500).optional(),
});

export async function listMovements(req: Request, res: Response) {
  const { productId } = req.query as { productId?: string };
  const page = Number(req.query.page ?? 1);
  const pageSize = Math.min(Number(req.query.pageSize ?? 30), 100);

  const where = { businessId: req.businessId, productId: productId || undefined };
  const [items, total] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where,
      include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.inventoryMovement.count({ where }),
  ]);

  res.json({ items, total, page, pageSize });
}

export async function listLowStock(req: Request, res: Response) {
  const products = await prisma.$queryRaw`
    SELECT id, name, sku, stock, "minStock", unit FROM "Product"
    WHERE "businessId" = ${req.businessId} AND status = 'ACTIVE' AND stock <= "minStock"
    ORDER BY stock ASC
  `;
  res.json({ items: products });
}

export async function adjustStock(req: Request, res: Response) {
  const input = adjustmentSchema.parse(req.body);

  const product = await prisma.product.findFirst({
    where: { id: input.productId, businessId: req.businessId },
  });
  if (!product) throw ApiError.notFound("Product not found");

  const updated = await prisma.$transaction(async (tx) => {
    const result = await recordInventoryMovement(tx, {
      businessId: req.businessId!,
      productId: input.productId,
      type: "ADJUSTMENT",
      quantity: input.quantity,
      note: input.note,
      createdBy: req.userId,
    });
    await logActivity({
      businessId: req.businessId!,
      userId: req.userId,
      action: "inventory.adjusted",
      entityType: "Product",
      entityId: input.productId,
      metadata: { quantity: input.quantity, note: input.note },
      tx,
    });
    return result;
  });

  res.json({ product: updated });
}
