import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requireBusiness, requireModule } from "../middleware/tenant";
import { prisma } from "../lib/prisma";
import { ApiError } from "../lib/errors";

const router = Router({ mergeParams: true });

router.use(requireAuth, requireBusiness, requireModule("notifications"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const unreadOnly = req.query.unreadOnly === "true";
    const items = await prisma.notification.findMany({
      where: { businessId: req.businessId, isRead: unreadOnly ? false : undefined },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const unreadCount = await prisma.notification.count({ where: { businessId: req.businessId, isRead: false } });
    res.json({ items, unreadCount });
  })
);

router.patch(
  "/:notificationId/read",
  asyncHandler(async (req, res) => {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.notificationId, businessId: req.businessId },
    });
    if (!notification) throw ApiError.notFound("Notification not found");
    const updated = await prisma.notification.update({ where: { id: notification.id }, data: { isRead: true } });
    res.json({ notification: updated });
  })
);

router.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({ where: { businessId: req.businessId, isRead: false }, data: { isRead: true } });
    res.status(204).send();
  })
);

export default router;
