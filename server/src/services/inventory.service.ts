import { Prisma, InventoryMovementType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { createNotification } from "./notification.service";

type TxClient = Prisma.TransactionClient;

/**
 * Single choke point for every stock change. Applies the delta to
 * Product.stock and writes an InventoryMovement row in the same transaction,
 * so stock and its audit trail can never drift apart. `quantity` is signed
 * for ADJUSTMENT (+/-) and unsigned for the semantic types, which apply a
 * fixed direction (PURCHASE/RETURN/INITIAL add, SALE subtracts).
 */
export async function recordInventoryMovement(
  tx: TxClient,
  params: {
    businessId: string;
    productId: string;
    type: InventoryMovementType;
    quantity: number;
    reference?: string;
    note?: string;
    createdBy?: string;
  }
) {
  const direction =
    params.type === "SALE" ? -1 : params.type === "ADJUSTMENT" ? Math.sign(params.quantity) || 1 : 1;
  const magnitude = Math.abs(params.quantity);
  const delta = direction * magnitude;

  const product = await tx.product.update({
    where: { id: params.productId },
    data: { stock: { increment: delta } },
  });

  await tx.inventoryMovement.create({
    data: {
      businessId: params.businessId,
      productId: params.productId,
      type: params.type,
      quantity: delta,
      reference: params.reference,
      note: params.note,
      createdBy: params.createdBy,
    },
  });

  if (product.stock <= 0) {
    await createNotification({
      businessId: params.businessId,
      type: "OUT_OF_STOCK",
      title: "Product out of stock",
      message: `${product.name} is out of stock`,
      tx,
    });
  } else if (product.stock <= product.minStock) {
    await createNotification({
      businessId: params.businessId,
      type: "LOW_STOCK",
      title: "Low stock alert",
      message: `${product.name} is running low (${product.stock} left)`,
      tx,
    });
  }

  return product;
}
