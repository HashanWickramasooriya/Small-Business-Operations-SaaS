import { Request, Response } from "express";
import { Role, MembershipStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";
import { slugify } from "../utils/slug";
import { logActivity } from "../services/activityLog.service";
import { createNotification } from "../services/notification.service";
import {
  createBusinessSchema,
  updateBusinessSchema,
  onboardingStepSchema,
  inviteMemberSchema,
} from "../validators/business.validators";

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "business";
  let candidate = root;
  let i = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await prisma.business.findUnique({ where: { slug: candidate } });
    if (!exists) return candidate;
    candidate = `${root}-${++i}`;
  }
}

export async function createBusiness(req: Request, res: Response) {
  const input = createBusinessSchema.parse(req.body);
  const slug = await uniqueSlug(input.name);

  const business = await prisma.$transaction(async (tx) => {
    const biz = await tx.business.create({
      data: {
        name: input.name,
        slug,
        businessType: input.businessType,
        currency: input.currency,
        country: input.country,
        phone: input.phone,
        email: input.email || undefined,
        onboardingStep: 1,
      },
    });
    await tx.membership.create({
      data: {
        userId: req.userId!,
        businessId: biz.id,
        role: Role.OWNER,
        status: MembershipStatus.ACTIVE,
        joinedAt: new Date(),
      },
    });
    await tx.businessSettings.create({ data: { businessId: biz.id } });
    await tx.expenseCategory.createMany({
      data: [
        { businessId: biz.id, name: "Rent", type: "RENT" },
        { businessId: biz.id, name: "Utilities", type: "UTILITIES" },
        { businessId: biz.id, name: "Salaries", type: "SALARIES" },
        { businessId: biz.id, name: "Transport", type: "TRANSPORT" },
        { businessId: biz.id, name: "Marketing", type: "MARKETING" },
        { businessId: biz.id, name: "Maintenance", type: "MAINTENANCE" },
        { businessId: biz.id, name: "Supplies", type: "SUPPLIES" },
        { businessId: biz.id, name: "Other", type: "OTHER" },
      ],
    });
    await logActivity({
      businessId: biz.id,
      userId: req.userId,
      action: "business.created",
      entityType: "Business",
      entityId: biz.id,
      tx,
    });
    return biz;
  });

  res.status(201).json({ business });
}

export async function updateBusiness(req: Request, res: Response) {
  const input = updateBusinessSchema.parse(req.body);
  const business = await prisma.business.update({
    where: { id: req.businessId },
    data: {
      ...input,
      email: input.email || undefined,
      taxRate: input.taxRate !== undefined ? input.taxRate : undefined,
    },
  });
  await logActivity({
    businessId: req.businessId!,
    userId: req.userId,
    action: "business.updated",
    entityType: "Business",
    entityId: business.id,
  });
  res.json({ business });
}

export async function getBusiness(req: Request, res: Response) {
  const business = await prisma.business.findUnique({
    where: { id: req.businessId },
    include: { settings: true },
  });
  if (!business) throw ApiError.notFound();
  res.json({ business, role: req.role });
}

export async function updateOnboarding(req: Request, res: Response) {
  const input = onboardingStepSchema.parse(req.body);
  const business = await prisma.business.update({
    where: { id: req.businessId },
    data: { onboardingStep: input.step, onboardingComplete: input.complete ?? undefined },
  });
  res.json({ business });
}

export async function listMembers(req: Request, res: Response) {
  const members = await prisma.membership.findMany({
    where: { businessId: req.businessId },
    include: { user: { select: { id: true, fullName: true, email: true, avatarUrl: true, isActive: true } } },
    orderBy: { invitedAt: "asc" },
  });
  res.json({ members });
}

export async function inviteMember(req: Request, res: Response) {
  const input = inviteMemberSchema.parse(req.body);
  const email = input.email.toLowerCase();

  const result = await prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { email } });
    if (!user) {
      // Placeholder password: user completes setup via password reset flow.
      const { hashPassword } = await import("../lib/password");
      const crypto = await import("crypto");
      const tempPassword = crypto.randomBytes(16).toString("hex");
      user = await tx.user.create({
        data: { email, fullName: input.fullName, passwordHash: await hashPassword(tempPassword) },
      });
    }

    const existingMembership = await tx.membership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId: req.businessId! } },
    });
    if (existingMembership) throw ApiError.conflict("This person is already part of the business");

    const membership = await tx.membership.create({
      data: {
        userId: user.id,
        businessId: req.businessId!,
        role: input.role,
        department: input.department,
        status: MembershipStatus.INVITED,
      },
    });

    await createNotification({
      businessId: req.businessId!,
      userId: req.userId,
      type: "EMPLOYEE_INVITE",
      title: "New team member invited",
      message: `${input.fullName} was invited as ${input.role}`,
      tx,
    });
    await logActivity({
      businessId: req.businessId!,
      userId: req.userId,
      action: "employee.invited",
      entityType: "Membership",
      entityId: membership.id,
      metadata: { email, role: input.role },
      tx,
    });

    return { user, membership };
  });

  res.status(201).json(result);
}

export async function updateMemberRole(req: Request, res: Response) {
  const { memberId } = req.params;
  const { role, status } = req.body as { role?: Role; status?: MembershipStatus };

  const membership = await prisma.membership.findFirst({
    where: { id: memberId, businessId: req.businessId },
  });
  if (!membership) throw ApiError.notFound("Member not found");

  const updated = await prisma.membership.update({
    where: { id: memberId },
    data: { role: role ?? undefined, status: status ?? undefined },
  });

  await logActivity({
    businessId: req.businessId!,
    userId: req.userId,
    action: "employee.role_changed",
    entityType: "Membership",
    entityId: updated.id,
    metadata: { role, status },
  });

  res.json({ membership: updated });
}

export async function removeMember(req: Request, res: Response) {
  const { memberId } = req.params;
  const membership = await prisma.membership.findFirst({
    where: { id: memberId, businessId: req.businessId },
  });
  if (!membership) throw ApiError.notFound("Member not found");
  if (membership.role === Role.OWNER) throw ApiError.badRequest("Cannot remove the business owner");

  await prisma.membership.delete({ where: { id: memberId } });
  res.status(204).send();
}
