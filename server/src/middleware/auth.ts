import { Request, Response, NextFunction } from "express";
import { ApiError } from "../lib/errors";
import { verifyAccessToken } from "../lib/tokens";
import { prisma } from "../lib/prisma";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.accessToken as string | undefined;
    if (!token) throw ApiError.unauthorized();

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) throw ApiError.unauthorized();

    req.userId = user.id;
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired session"));
  }
}
