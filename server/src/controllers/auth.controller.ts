import { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";
import { hashPassword, verifyPassword } from "../lib/password";
import {
  signAccessToken,
  generateRefreshTokenValue,
  refreshTokenExpiryDate,
  verifyAccessToken,
} from "../lib/tokens";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "../validators/auth.validators";
import { env } from "../config/env";

const cookieOpts = {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: "lax" as const,
  path: "/",
};

async function issueSession(res: Response, userId: string, email: string) {
  const accessToken = signAccessToken({ userId, email });
  const refreshToken = generateRefreshTokenValue();

  await prisma.refreshToken.create({
    data: { token: refreshToken, userId, expiresAt: refreshTokenExpiryDate() },
  });

  res.cookie("accessToken", accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
  res.cookie("refreshToken", refreshToken, {
    ...cookieOpts,
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  });
}

function sanitizeUser(user: { id: string; email: string; fullName: string; avatarUrl: string | null }) {
  return { id: user.id, email: user.email, fullName: user.fullName, avatarUrl: user.avatarUrl };
}

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) throw ApiError.conflict("An account with this email already exists");

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { email: input.email.toLowerCase(), passwordHash, fullName: input.fullName },
  });

  await issueSession(res, user.id, user.email);
  res.status(201).json({ user: sanitizeUser(user) });
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user || !user.isActive) throw ApiError.unauthorized("Invalid email or password");

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized("Invalid email or password");

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await issueSession(res, user.id, user.email);
  res.json({ user: sanitizeUser(user) });
}

export async function logout(req: Request, res: Response) {
  const refreshToken = req.cookies?.refreshToken as string | undefined;
  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  res.clearCookie("accessToken", cookieOpts);
  res.clearCookie("refreshToken", cookieOpts);
  res.status(204).send();
}

export async function refresh(req: Request, res: Response) {
  const refreshToken = req.cookies?.refreshToken as string | undefined;
  if (!refreshToken) throw ApiError.unauthorized();

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw ApiError.unauthorized("Session expired, please log in again");
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user || !user.isActive) throw ApiError.unauthorized();

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  await issueSession(res, user.id, user.email);
  res.json({ user: sanitizeUser(user) });
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: {
      memberships: {
        include: { business: true },
      },
    },
  });
  if (!user) throw ApiError.unauthorized();

  res.json({
    user: sanitizeUser(user),
    memberships: user.memberships.map((m) => ({
      businessId: m.businessId,
      role: m.role,
      status: m.status,
      business: {
        id: m.business.id,
        name: m.business.name,
        slug: m.business.slug,
        logoUrl: m.business.logoUrl,
        currency: m.business.currency,
        onboardingComplete: m.business.onboardingComplete,
      },
    })),
  });
}

// Forgot/reset password: generates a real, single-use, expiring token and
// stores it server-side. Email delivery is not wired to a provider yet, so
// the token is returned in the response only in non-production environments
// (email-sending architecture is ready to plug in via a mail service).
export async function forgotPassword(req: Request, res: Response) {
  const input = forgotPasswordSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });

  // Always respond 200 to avoid leaking which emails are registered.
  if (!user) return res.json({ message: "If that email exists, a reset link has been sent." });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.passwordResetToken.create({ data: { token, userId: user.id, expiresAt } });

  res.json({
    message: "If that email exists, a reset link has been sent.",
    devToken: env.nodeEnv !== "production" ? token : undefined,
  });
}

export async function resetPassword(req: Request, res: Response) {
  const input = resetPasswordSchema.parse(req.body);
  const record = await prisma.passwordResetToken.findUnique({ where: { token: input.token } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw ApiError.badRequest("This reset link is invalid or has expired");
  }

  const passwordHash = await hashPassword(input.password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  res.json({ message: "Password updated. You can now log in." });
}

export { verifyAccessToken };
