import { Router } from "express";
import prisma from "../../../prisma";
import { sendFcmNotification } from "../../../services/fcm.service";
const router = Router();
router.get("/", async (_req, res) => {
  try {
    const refunds = await prisma.refund.findMany({
      include: {
        booking: {
          include: {
            customer: true,
            salon: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return res.json(refunds);
  } catch (error) {
    console.error("Get Refunds Error:", error);
    return res.status(500).json({
      message: "Failed to fetch refunds",
    });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const refund = await prisma.refund.findUnique({
      where: {
        id,
      },
      include: {
        booking: {
          include: {
            customer: true,
            salon: true,
          },
        },
      },
    });
    if (!refund) {
      return res.status(404).json({
        message: "Refund not found",
      });
    }
    return res.json(refund);
  } catch (error) {
    console.error("Get Refund Error:", error);
    return res.status(500).json({
      message: "Failed to fetch refund",
    });
  }
});
router.patch("/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { refundStatus, paymentMethod, transactionId } = req.body;
    if (!Number.isInteger(id)) {
      return res.status(400).json({
        message: "Invalid refund ID",
      });
    }
    const existingRefund = await prisma.refund.findUnique({
      where: {
        id,
      },
      include: {
        booking: {
          include: {
            customer: true,
            salon: true,
          },
        },
      },
    });
    if (!existingRefund) {
      return res.status(404).json({
        message: "Refund not found",
      });
    }
    const refund = await prisma.refund.update({
      where: {
        id,
      },
      data: {
        refundStatus,
        paymentMethod,
        transactionId,
        refundedAt: refundStatus === "COMPLETED" ? new Date() : undefined,
      },
      include: {
        booking: {
          include: {
            customer: true,
            salon: true,
          },
        },
      },
    });
    const refundJustCompleted =
      existingRefund.refundStatus !== "COMPLETED" &&
      refundStatus === "COMPLETED";
    const refundJustFailed =
      existingRefund.refundStatus !== "FAILED" && refundStatus === "FAILED";
    if (refundJustCompleted || refundJustFailed) {
      const customerId = refund.booking.customerId;
      const amount = Number(refund.refundAmount || 0);
      const bookingId = refund.booking.bookingId;
      const isCompleted = refundJustCompleted;
      const notificationTitle = isCompleted
        ? "Refund Completed 💰"
        : "Refund Failed";
      const notificationMessage = isCompleted
        ? `Your refund of ₹${amount} for booking ${bookingId} has been completed successfully.`
        : `Your refund of ₹${amount} for booking ${bookingId} could not be processed. Please contact support for assistance.`;
      const notificationType = isCompleted
        ? "REFUND_COMPLETED"
        : "REFUND_FAILED";
      const notification = await prisma.notification.create({
        data: {
          userId: customerId,
          title: notificationTitle,
          message: notificationMessage,
        },
      });
      const customerTokens = await prisma.deviceToken.findMany({
        where: {
          userId: customerId,
          isActive: true,
        },
      });
      for (const device of customerTokens) {
        try {
          await sendFcmNotification(
            device.token,
            notificationTitle,
            notificationMessage,
            {
              type: notificationType,
              recipientId: String(customerId),
              notificationId: String(notification.id),
              bookingId: String(bookingId),
              screen: "Refund",
            },
          );
        } catch (error) {
          console.error(
            `Customer ${notificationType} FCM failed for token ${device.id}:`,
            error,
          );
        }
      }
    }
    return res.json(refund);
  } catch (error) {
    console.error("Update Refund Status Error:", error);
    return res.status(500).json({
      message: "Failed to update refund",
    });
  }
});
export default router;
