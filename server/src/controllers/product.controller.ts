import { Request, Response } from "express";
import { z } from "zod";
import { Prisma, ProductStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";
import { logActivity } from "../services/activityLog.service";
import { recordInventoryMovement } from "../services/inventory.service";
import { productSchema, productUpdateSchema, productQuerySchema } from "../validators/product.validators";

export async function listProducts(req: Request, res: Response) {
  const q = productQuerySchema.parse(req.query);

  let lowStockIds: string[] | undefined;
  if (q.lowStock) {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Product"
      WHERE "businessId" = ${req.businessId} AND stock <= "minStock"
    `;
    lowStockIds = rows.map((r) => r.id);
  }

  const where: Prisma.ProductWhereInput = {
    businessId: req.businessId,
    status: q.status,
    categoryId: q.categoryId || undefined,
    ...(lowStockIds ? { id: { in: lowStockIds } } : {}),
    ...(q.search
      ? {
          OR: [
            { name: { contains: q.search, mode: "insensitive" } },
            { sku: { contains: q.search, mode: "insensitive" } },
            { barcode: { contains: q.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, supplier: { select: { id: true, name: true } } },
      orderBy: { [q.sortBy]: q.sortDir },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  res.json({ items, total, page: q.page, pageSize: q.pageSize });
}

export async function getProduct(req: Request, res: Response) {
  const product = await prisma.product.findFirst({
    where: { id: req.params.productId, businessId: req.businessId },
    include: { category: true, supplier: true },
  });
  if (!product) throw ApiError.notFound("Product not found");
  res.json({ product });
}

export async function createProduct(req: Request, res: Response) {
  const input = productSchema.parse(req.body);

  const existing = await prisma.product.findFirst({
    where: { businessId: req.businessId, sku: input.sku },
  });
  if (existing) throw ApiError.conflict("A product with this SKU already exists");

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        businessId: req.businessId!,
        name: input.name,
        sku: input.sku,
        barcode: input.barcode || undefined,
        categoryId: input.categoryId || undefined,
        description: input.description || undefined,
        purchasePrice: input.purchasePrice,
        sellingPrice: input.sellingPrice,
        taxRate: input.taxRate,
        stock: input.stock,
        minStock: input.minStock,
        unit: input.unit,
        imageUrl: input.imageUrl || undefined,
        supplierId: input.supplierId || undefined,
      },
    });

    if (input.stock > 0) {
      await recordInventoryMovement(tx, {
        businessId: req.businessId!,
        productId: created.id,
        type: "INITIAL",
        quantity: input.stock,
        note: "Initial stock on product creation",
        createdBy: req.userId,
      });
    }

    await logActivity({
      businessId: req.businessId!,
      userId: req.userId,
      action: "product.created",
      entityType: "Product",
      entityId: created.id,
      metadata: { name: created.name, sku: created.sku },
      tx,
    });

    return created;
  });

  res.status(201).json({ product });
}

export async function updateProduct(req: Request, res: Response) {
  const input = productUpdateSchema.parse(req.body);
  const existing = await prisma.product.findFirst({
    where: { id: req.params.productId, businessId: req.businessId },
  });
  if (!existing) throw ApiError.notFound("Product not found");

  if (input.sku && input.sku !== existing.sku) {
    const dup = await prisma.product.findFirst({
      where: { businessId: req.businessId, sku: input.sku, NOT: { id: existing.id } },
    });
    if (dup) throw ApiError.conflict("A product with this SKU already exists");
  }

  const product = await prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id: existing.id },
      data: {
        ...input,
        stock: undefined, // stock changes must go through inventory adjustments
        categoryId: input.categoryId || undefined,
        supplierId: input.supplierId || undefined,
      },
    });
    await logActivity({
      businessId: req.businessId!,
      userId: req.userId,
      action: "product.updated",
      entityType: "Product",
      entityId: updated.id,
      tx,
    });
    return updated;
  });

  res.json({ product });
}

export async function archiveProduct(req: Request, res: Response) {
  const existing = await prisma.product.findFirst({
    where: { id: req.params.productId, businessId: req.businessId },
  });
  if (!existing) throw ApiError.notFound("Product not found");

  const product = await prisma.product.update({
    where: { id: existing.id },
    data: { status: existing.status === ProductStatus.ACTIVE ? ProductStatus.ARCHIVED : ProductStatus.ACTIVE },
  });

  await logActivity({
    businessId: req.businessId!,
    userId: req.userId,
    action: product.status === ProductStatus.ARCHIVED ? "product.archived" : "product.restored",
    entityType: "Product",
    entityId: product.id,
  });

  res.json({ product });
}

export async function bulkImportProducts(req: Request, res: Response) {
  const rows = z
    .array(productSchema)
    .parse(req.body.products);

  const results: { created: number; skipped: number; errors: string[] } = {
    created: 0,
    skipped: 0,
    errors: [],
  };

  for (const row of rows) {
    const exists = await prisma.product.findFirst({ where: { businessId: req.businessId, sku: row.sku } });
    if (exists) {
      results.skipped++;
      continue;
    }
    await prisma.product.create({
      data: {
        businessId: req.businessId!,
        name: row.name,
        sku: row.sku,
        barcode: row.barcode || undefined,
        purchasePrice: row.purchasePrice,
        sellingPrice: row.sellingPrice,
        taxRate: row.taxRate,
        stock: row.stock,
        minStock: row.minStock,
        unit: row.unit,
      },
    });
    results.created++;
  }

  await logActivity({
    businessId: req.businessId!,
    userId: req.userId,
    action: "product.bulk_imported",
    entityType: "Product",
    metadata: results,
  });

  res.json(results);
}
