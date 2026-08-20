import { z } from "zod";

export const purchaseItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  unitCost: z.number().min(0),
});

export const createPurchaseSchema = z.object({
  supplierId: z.string(),
  notes: z.string().max(1000).optional(),
  items: z.array(purchaseItemSchema).min(1, "Add at least one item"),
});

export const receivePurchaseSchema = z.object({
  items: z.array(z.object({ purchaseItemId: z.string(), quantityReceived: z.number().int().min(0) })).min(1),
});
