import { z } from "zod";
import { PaymentMethod } from "@prisma/client";

export const saleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  discount: z.number().min(0).default(0),
});

export const createSaleSchema = z.object({
  customerId: z.string().optional().or(z.literal("")),
  items: z.array(saleItemSchema).min(1, "Add at least one product"),
  discount: z.number().min(0).default(0),
  paymentMethod: z.nativeEnum(PaymentMethod).default("CASH"),
  amountPaid: z.number().min(0).optional(),
});

export const refundSaleSchema = z.object({
  items: z.array(z.object({ saleItemId: z.string(), quantity: z.number().int().positive() })).min(1),
  reason: z.string().max(500).optional(),
});
