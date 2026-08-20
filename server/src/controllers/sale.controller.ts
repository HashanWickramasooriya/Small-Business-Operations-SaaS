import { Request, Response } from "express";
import { SaleStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";
import { logActivity } from "../services/activityLog.service";
import { recordInventoryMovement } from "../services/inventory.service";
import { createSaleSchema, refundSaleSchema } from "../validators/sale.validators";

async function nextReference(businessId: string) {
  const count = await prisma.sale.count({ where: { businessId } });
  return `SALE-${String(count + 1).padStart(6, "0")}`;
}

export async function listSales(req: Request, res: Response) {
  const page = Number(req.query.page ?? 1);
  const pageSize = Math.min(Number(req.query.pageSize ?? 20), 100);
  const status = req.query.status as SaleStatus | undefined;
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to = req.query.to ? new Date(req.query.to as string) : undefined;

  const where = {
    businessId: req.businessId,
    status: status || undefined,
    createdAt: from || to ? { gte: from, lte: to } : undefined,
  };

  const [items, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: { customer: { select: { id: true, name: true } }, items: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.sale.count({ where }),
  ]);

  res.json({ items, total, page, pageSize });
}

export async function getSale(req: Request, res: Response) {
  const sale = await prisma.sale.findFirst({
    where: { id: req.params.saleId, businessId: req.businessId },
    include: { customer: true, items: { include: { product: true } } },
  });
  if (!sale) throw ApiError.notFound("Sale not found");
  res.json({ sale });
}

export async function createSale(req: Request, res: Response) {
  const input = createSaleSchema.parse(req.body);

  const productIds = input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, businessId: req.businessId },
  });
  if (products.length !== productIds.length) throw ApiError.badRequest("One or more products were not found");

  const productMap = new Map(products.map((p) => [p.id, p]));
  for (const item of input.items) {
    const product = productMap.get(item.productId)!;
    if (product.stock < item.quantity) {
      throw ApiError.badRequest(`Not enough stock for ${product.name} (${product.stock} available)`);
    }
  }

  let subtotal = 0;
  let tax = 0;
  const itemsData = input.items.map((item) => {
    const product = productMap.get(item.productId)!;
    const price = Number(product.sellingPrice);
    const lineSubtotal = price * item.quantity - item.discount;
    const lineTax = lineSubtotal * (Number(product.taxRate) / 100);
    subtotal += lineSubtotal;
    tax += lineTax;
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: price,
      discount: item.discount,
      tax: lineTax,
      total: lineSubtotal + lineTax,
    };
  });

  const total = subtotal + tax - input.discount;
  if (total < 0) throw ApiError.badRequest("Discount cannot exceed order total");

  const reference = await nextReference(req.businessId!);

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        businessId: req.businessId!,
        customerId: input.customerId || undefined,
        reference,
        status: SaleStatus.COMPLETED,
        subtotal,
        discount: input.discount,
        tax,
        total,
        paymentMethod: input.paymentMethod,
        amountPaid: input.amountPaid ?? total,
        soldById: req.userId,
        items: { create: itemsData },
      },
      include: { items: true, customer: true },
    });

    for (const item of itemsData) {
      await recordInventoryMovement(tx, {
        businessId: req.businessId!,
        productId: item.productId,
        type: "SALE",
        quantity: item.quantity,
        reference,
        createdBy: req.userId,
      });
    }

    const amountPaid = input.amountPaid ?? total;
    if (amountPaid < total && input.customerId) {
      const outstanding = total - amountPaid;
      await tx.customer.update({
        where: { id: input.customerId },
        data: { outstandingBalance: { increment: outstanding } },
      });
      const { createNotification } = await import("../services/notification.service");
      await createNotification({
        businessId: req.businessId!,
        type: "OUTSTANDING_PAYMENT",
        title: "Outstanding customer payment",
        message: `${created.customer?.name ?? "A customer"} has an outstanding balance of ${outstanding.toFixed(2)}`,
        tx,
      });
    }

    await logActivity({
      businessId: req.businessId!,
      userId: req.userId,
      action: "sale.created",
      entityType: "Sale",
      entityId: created.id,
      metadata: { reference, total },
      tx,
    });

    return created;
  });

  res.status(201).json({ sale });
}

export async function refundSale(req: Request, res: Response) {
  const input = refundSaleSchema.parse(req.body);
  const sale = await prisma.sale.findFirst({
    where: { id: req.params.saleId, businessId: req.businessId },
    include: { items: true },
  });
  if (!sale) throw ApiError.notFound("Sale not found");
  if (sale.status === SaleStatus.VOID) throw ApiError.badRequest("This sale has already been voided");

  const updated = await prisma.$transaction(async (tx) => {
    let refundTotal = 0;
    for (const refundItem of input.items) {
      const saleItem = sale.items.find((i) => i.id === refundItem.saleItemId);
      if (!saleItem) throw ApiError.badRequest("Invalid sale item");
      if (refundItem.quantity > saleItem.quantity) throw ApiError.badRequest("Refund quantity exceeds sold quantity");

      const unitTotal = Number(saleItem.total) / saleItem.quantity;
      refundTotal += unitTotal * refundItem.quantity;

      await recordInventoryMovement(tx, {
        businessId: req.businessId!,
        productId: saleItem.productId,
        type: "RETURN",
        quantity: refundItem.quantity,
        reference: sale.reference,
        note: input.reason,
        createdBy: req.userId,
      });
    }

    const fullyRefunded = refundTotal >= Number(sale.total) - 0.01;
    const result = await tx.sale.update({
      where: { id: sale.id },
      data: { status: fullyRefunded ? SaleStatus.REFUNDED : SaleStatus.PARTIALLY_REFUNDED },
      include: { items: true, customer: true },
    });

    await logActivity({
      businessId: req.businessId!,
      userId: req.userId,
      action: "sale.refunded",
      entityType: "Sale",
      entityId: sale.id,
      metadata: { refundTotal, reason: input.reason },
      tx,
    });

    return result;
  });

  res.json({ sale: updated });
}
