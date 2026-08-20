import { Request, Response } from "express";
import { z } from "zod";
import { PaymentMethod } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";
import { logActivity } from "../services/activityLog.service";
import { createNotification } from "../services/notification.service";

const expenseSchema = z.object({
  categoryId: z.string(),
  amount: z.number().positive(),
  vendor: z.string().max(150).optional().or(z.literal("")),
  description: z.string().max(1000).optional().or(z.literal("")),
  paymentMethod: z.nativeEnum(PaymentMethod).default("CASH"),
  receiptUrl: z.string().optional().or(z.literal("")),
  isRecurring: z.boolean().default(false),
  recurrenceInterval: z.enum(["weekly", "monthly", "yearly"]).optional(),
  date: z.string().datetime().or(z.string().min(1)),
});

export async function listExpenseCategories(req: Request, res: Response) {
  const categories = await prisma.expenseCategory.findMany({ where: { businessId: req.businessId }, orderBy: { name: "asc" } });
  res.json({ categories });
}

export async function listExpenses(req: Request, res: Response) {
  const page = Number(req.query.page ?? 1);
  const pageSize = Math.min(Number(req.query.pageSize ?? 20), 100);
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to = req.query.to ? new Date(req.query.to as string) : undefined;
  const categoryId = req.query.categoryId as string | undefined;

  const where = {
    businessId: req.businessId,
    categoryId: categoryId || undefined,
    date: from || to ? { gte: from, lte: to } : undefined,
  };

  const [items, total, sum] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { category: true },
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
  ]);

  res.json({ items, total, page, pageSize, totalAmount: sum._sum.amount ?? 0 });
}

export async function createExpense(req: Request, res: Response) {
  const input = expenseSchema.parse(req.body);

  const category = await prisma.expenseCategory.findFirst({ where: { id: input.categoryId, businessId: req.businessId } });
  if (!category) throw ApiError.badRequest("Invalid expense category");

  const expense = await prisma.$transaction(async (tx) => {
    const created = await tx.expense.create({
      data: {
        businessId: req.businessId!,
        categoryId: input.categoryId,
        amount: input.amount,
        vendor: input.vendor || undefined,
        description: input.description || undefined,
        paymentMethod: input.paymentMethod,
        receiptUrl: input.receiptUrl || undefined,
        isRecurring: input.isRecurring,
        recurrenceInterval: input.recurrenceInterval,
        date: new Date(input.date),
      },
    });

    const settings = await tx.businessSettings.findUnique({ where: { businessId: req.businessId! } });
    if (settings?.notifyLargeExpense && input.amount >= Number(settings.largeExpenseThreshold)) {
      await createNotification({
        businessId: req.businessId!,
        type: "LARGE_EXPENSE",
        title: "Large expense recorded",
        message: `A ${category.name} expense of ${input.amount.toFixed(2)} was recorded`,
        tx,
      });
    }

    await logActivity({
      businessId: req.businessId!,
      userId: req.userId,
      action: "expense.created",
      entityType: "Expense",
      entityId: created.id,
      metadata: { amount: input.amount, category: category.name },
      tx,
    });

    return created;
  });

  res.status(201).json({ expense });
}

export async function updateExpense(req: Request, res: Response) {
  const input = expenseSchema.partial().parse(req.body);
  const existing = await prisma.expense.findFirst({ where: { id: req.params.expenseId, businessId: req.businessId } });
  if (!existing) throw ApiError.notFound("Expense not found");

  const expense = await prisma.expense.update({
    where: { id: existing.id },
    data: {
      ...input,
      vendor: input.vendor || undefined,
      date: input.date ? new Date(input.date) : undefined,
    },
  });
  res.json({ expense });
}

export async function deleteExpense(req: Request, res: Response) {
  const existing = await prisma.expense.findFirst({ where: { id: req.params.expenseId, businessId: req.businessId } });
  if (!existing) throw ApiError.notFound("Expense not found");
  await prisma.expense.delete({ where: { id: existing.id } });
  res.status(204).send();
}
