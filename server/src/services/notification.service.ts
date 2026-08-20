import { prisma } from "../lib/prisma";
import { NotificationType, Prisma } from "@prisma/client";

export async function createNotification(params: {
  businessId: string;
  userId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  tx?: Prisma.TransactionClient;
}) {
  const client = params.tx ?? prisma;
  return client.notification.create({
    data: {
      businessId: params.businessId,
      userId: params.userId ?? undefined,
      type: params.type,
      title: params.title,
      message: params.message,
    },
  });
}
