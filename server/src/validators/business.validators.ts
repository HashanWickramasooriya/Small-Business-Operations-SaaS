import { z } from "zod";
import { Role } from "@prisma/client";

export const createBusinessSchema = z.object({
  name: z.string().min(2).max(120),
  businessType: z.string().optional(),
  currency: z.string().min(3).max(3).default("USD"),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

export const updateBusinessSchema = createBusinessSchema.partial().extend({
  logoUrl: z.string().optional(),
  address: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
});

export const onboardingStepSchema = z.object({
  step: z.number().int().min(0).max(10),
  complete: z.boolean().optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  role: z.nativeEnum(Role),
  department: z.string().optional(),
});
