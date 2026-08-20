import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";

const categorySchema = z.object({ name: z.string().min(1).max(100) });

export async function listCategories(req: Request, res: Response) {
  const categories = await prisma.category.findMany({
    where: { businessId: req.businessId },
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
  res.json({ categories });
}

export async function createCategory(req: Request, res: Response) {
  const input = categorySchema.parse(req.body);
  const existing = await prisma.category.findFirst({ where: { businessId: req.businessId, name: input.name } });
  if (existing) throw ApiError.conflict("A category with this name already exists");
  const category = await prisma.category.create({ data: { businessId: req.businessId!, name: input.name } });
  res.status(201).json({ category });
}

export async function deleteCategory(req: Request, res: Response) {
  const category = await prisma.category.findFirst({ where: { id: req.params.categoryId, businessId: req.businessId } });
  if (!category) throw ApiError.notFound("Category not found");
  await prisma.category.delete({ where: { id: category.id } });
  res.status(204).send();
}
