import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";

export async function logActivity(params: {
  businessId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  tx?: Prisma.TransactionClient;
}) {
  const client = params.tx ?? prisma;
  return client.activityLog.create({
    data: {
      businessId: params.businessId,
      userId: params.userId ?? undefined,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? undefined,
      metadata: params.metadata,
    },
  });
}
