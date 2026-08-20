import { Request, Response, NextFunction } from "express";
import { Role, MembershipStatus } from "@prisma/client";
import { ApiError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { Module, canAccessModule, canWriteModule } from "../lib/permissions";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      businessId?: string;
      role?: Role;
    }
  }
}

/**
 * Resolves the active business from the X-Business-Id header (or :businessId
 * route param) and verifies — on every request, against the database — that
 * the authenticated user actually has an active membership on it. The client
 * supplies which business it wants; the server is the sole authority on
 * whether that access is allowed. This is the tenant-isolation boundary:
 * every business-scoped query downstream must filter by req.businessId.
 */
export async function requireBusiness(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.userId) throw ApiError.unauthorized();

    const businessId =
      (req.params.businessId as string | undefined) ??
      (req.headers["x-business-id"] as string | undefined);

    if (!businessId) throw ApiError.badRequest("Missing business context");

    const membership = await prisma.membership.findUnique({
      where: { userId_businessId: { userId: req.userId, businessId } },
    });

    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw ApiError.forbidden("You do not have access to this business");
    }

    req.businessId = businessId;
    req.role = membership.role;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireModule(module: Module, action: "read" | "write" = "read") {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.role) return next(ApiError.forbidden());

    if (!canAccessModule(req.role, module)) {
      return next(ApiError.forbidden(`Your role does not have access to ${module}`));
    }
    if (action === "write" && !canWriteModule(req.role, module)) {
      return next(ApiError.forbidden(`Your role cannot modify ${module}`));
    }
    next();
  };
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.role || !roles.includes(req.role)) {
      return next(ApiError.forbidden("Insufficient role for this action"));
    }
    next();
  };
}
