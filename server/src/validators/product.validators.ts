import { z } from "zod";
import { ProductStatus } from "@prisma/client";

export const productSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(60),
  barcode: z.string().max(60).optional().or(z.literal("")),
  categoryId: z.string().optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
  purchasePrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  taxRate: z.number().min(0).max(100).default(0),
  stock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(0),
  unit: z.string().max(20).default("pcs"),
  imageUrl: z.string().optional().or(z.literal("")),
  supplierId: z.string().optional().or(z.literal("")),
  status: z.nativeEnum(ProductStatus).optional(),
});

export const productUpdateSchema = productSchema.partial();

export const productQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  lowStock: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["name", "stock", "sellingPrice", "createdAt"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});
