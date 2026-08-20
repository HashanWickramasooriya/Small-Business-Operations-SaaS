import { Request, Response } from "express";
import { PurchaseStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";
import { logActivity } from "../services/activityLog.service";
import { createNotification } from "../services/notification.service";
import { recordInventoryMovement } from "../services/inventory.service";
import { createPurchaseSchema, receivePurchaseSchema } from "../validators/purchase.validators";

async function nextReference(businessId: string) {
  const count = await prisma.purchase.count({ where: { businessId } });
  return `PO-${String(count + 1).padStart(5, "0")}`;
}

export async function listPurchases(req: Request, res: Response) {
  const status = req.query.status as PurchaseStatus | undefined;
  const purchases = await prisma.purchase.findMany({
    where: { businessId: req.businessId, status: status || undefined },
    include: { supplier: { select: { id: true, name: true } }, items: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ items: purchases });
}

export async function getPurchase(req: Request, res: Response) {
  const purchase = await prisma.purchase.findFirst({
    where: { id: req.params.purchaseId, businessId: req.businessId },
    include: { supplier: true, items: { include: { product: true } } },
  });
  if (!purchase) throw ApiError.notFound("Purchase not found");
  res.json({ purchase });
}

export async function createPurchase(req: Request, res: Response) {
  const input = createPurchaseSchema.parse(req.body);
  const totalCost = input.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
  const reference = await nextReference(req.businessId!);

  const purchase = await prisma.$transaction(async (tx) => {
    const created = await tx.purchase.create({
      data: {
        businessId: req.businessId!,
        supplierId: input.supplierId,
        reference,
        totalCost,
        notes: input.notes,
        status: PurchaseStatus.DRAFT,
        items: {
          create: input.items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitCost: i.unitCost })),
        },
      },
      include: { items: true },
    });
    await logActivity({
      businessId: req.businessId!,
      userId: req.userId,
      action: "purchase.created",
      entityType: "Purchase",
      entityId: created.id,
      tx,
    });
    return created;
  });

  res.status(201).json({ purchase });
}

export async function updatePurchaseStatus(req: Request, res: Response) {
  const { status } = req.body as { status: PurchaseStatus };
  const purchase = await prisma.purchase.findFirst({ where: { id: req.params.purchaseId, businessId: req.businessId } });
  if (!purchase) throw ApiError.notFound("Purchase not found");

  const validTransitions: Record<PurchaseStatus, PurchaseStatus[]> = {
    DRAFT: [PurchaseStatus.ORDERED, PurchaseStatus.CANCELLED],
    ORDERED: [PurchaseStatus.PARTIALLY_RECEIVED, PurchaseStatus.RECEIVED, PurchaseStatus.CANCELLED],
    PARTIALLY_RECEIVED: [PurchaseStatus.RECEIVED, PurchaseStatus.CANCELLED],
    RECEIVED: [],
    CANCELLED: [],
  };
  if (!validTransitions[purchase.status].includes(status)) {
    throw ApiError.badRequest(`Cannot move purchase from ${purchase.status} to ${status}`);
  }

  const updated = await prisma.purchase.update({
    where: { id: purchase.id },
    data: { status, orderedAt: status === PurchaseStatus.ORDERED ? new Date() : undefined },
  });

  if (status === PurchaseStatus.ORDERED) {
    await createNotification({
      businessId: req.businessId!,
      type: "PENDING_PURCHASE",
      title: "Purchase order placed",
      message: `Purchase order ${purchase.reference} is awaiting delivery`,
    });
  }

  await logActivity({
    businessId: req.businessId!,
    userId: req.userId,
    action: "purchase.status_changed",
    entityType: "Purchase",
    entityId: purchase.id,
    metadata: { from: purchase.status, to: status },
  });

  res.json({ purchase: updated });
}

export async function receivePurchase(req: Request, res: Response) {
  const input = receivePurchaseSchema.parse(req.body);
  const purchase = await prisma.purchase.findFirst({
    where: { id: req.params.purchaseId, businessId: req.businessId },
    include: { items: true },
  });
  if (!purchase) throw ApiError.notFound("Purchase not found");
  if (!["ORDERED", "PARTIALLY_RECEIVED"].includes(purchase.status)) {
    throw ApiError.badRequest("Purchase must be ordered before it can be received");
  }

  const updated = await prisma.$transaction(async (tx) => {
    for (const receipt of input.items) {
      const item = purchase.items.find((i) => i.id === receipt.purchaseItemId);
      if (!item) throw ApiError.badRequest("Invalid purchase item");
      const remaining = item.quantity - item.quantityReceived;
      const toReceive = Math.min(receipt.quantityReceived, remaining);
      if (toReceive <= 0) continue;

      await tx.purchaseItem.update({
        where: { id: item.id },
        data: { quantityReceived: { increment: toReceive } },
      });

      await recordInventoryMovement(tx, {
        businessId: req.businessId!,
        productId: item.productId,
        type: "PURCHASE",
        quantity: toReceive,
        reference: purchase.reference,
        createdBy: req.userId,
      });
    }

    const items = await tx.purchaseItem.findMany({ where: { purchaseId: purchase.id } });
    const allReceived = items.every((i) => i.quantityReceived >= i.quantity);
    const anyReceived = items.some((i) => i.quantityReceived > 0);
    const newStatus = allReceived
      ? PurchaseStatus.RECEIVED
      : anyReceived
      ? PurchaseStatus.PARTIALLY_RECEIVED
      : purchase.status;

    const result = await tx.purchase.update({
      where: { id: purchase.id },
      data: { status: newStatus, receivedAt: allReceived ? new Date() : undefined },
      include: { items: true, supplier: true },
    });

    await logActivity({
      businessId: req.businessId!,
      userId: req.userId,
      action: "purchase.received",
      entityType: "Purchase",
      entityId: purchase.id,
      tx,
    });

    return result;
  });

  res.json({ purchase: updated });
}
