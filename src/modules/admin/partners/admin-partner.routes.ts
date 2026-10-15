import { Router } from "express";
import prisma from "../../../prisma";
import { sendFcmNotification } from "../../../services/fcm.service";
const router = Router();
router.get("/", async (_req, res) => {
  try {
    const partners = await prisma.partner.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        salons: {
          select: {
            id: true,
            name: true,
            category: true,
            city: true,
            state: true,
            status: true,
            isLive: true,
            createdAt: true,
          },
        },
      },
    });
    const formattedPartners = partners.map((partner) => ({
      id: partner.id,
      name: partner.name,
      mobile: partner.mobile,
      email: partner.email,
      status: partner.status,
      createdAt: partner.createdAt,
      totalSalons: partner.salons.length,
      salons: partner.salons,
    }));
    return res.json(formattedPartners);
  } catch (error) {
    console.error("Get Admin Partners Error:", error);
    return res.status(500).json({
      message: "Failed to fetch partners",
    });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const partnerId = Number(req.params.id);
    if (!Number.isInteger(partnerId)) {
      return res.status(400).json({
        message: "Invalid partner ID",
      });
    }
    const partner = await prisma.partner.findUnique({
      where: {
        id: partnerId,
      },
      include: {
        salons: {
          select: {
            id: true,
            name: true,
            category: true,
            ownerName: true,
            address: true,
            city: true,
            state: true,
            pincode: true,
            status: true,
            isLive: true,
            createdAt: true,
          },
        },
      },
    });
    if (!partner) {
      return res.status(404).json({
        message: "Partner not found",
      });
    }
    return res.json({
      id: partner.id,
      name: partner.name,
      mobile: partner.mobile,
      email: partner.email,
      status: partner.status,
      createdAt: partner.createdAt,
      totalSalons: partner.salons.length,
      salons: partner.salons,
    });
  } catch (error) {
    console.error("Get Admin Partner Details Error:", error);
    return res.status(500).json({
      message: "Failed to fetch partner details",
    });
  }
});
router.get("/:id/status", async (req, res) => {
  try {
    const partnerId = Number(req.params.id);
    if (!Number.isInteger(partnerId)) {
      return res.status(400).json({
        message: "Invalid partner ID",
      });
    }
    const partner = await prisma.partner.findUnique({
      where: {
        id: partnerId,
      },
      select: {
        id: true,
        status: true,
      },
    });
    if (!partner) {
      return res.status(404).json({
        message: "Partner not found",
      });
    }
    return res.json({
      id: partner.id,
      status: partner.status,
    });
  } catch (error) {
    console.error("Get Partner Status Error:", error);
    return res.status(500).json({
      message: "Failed to fetch partner status",
    });
  }
});
router.patch("/:id/status", async (req, res) => {
  try {
    const partnerId = Number(req.params.id);
    const { status } = req.body;
    if (!Number.isInteger(partnerId)) {
      return res.status(400).json({
        message: "Invalid partner ID",
      });
    }
    if (!["ACTIVE", "SUSPENDED"].includes(status)) {
      return res.status(400).json({
        message: "Status must be ACTIVE or SUSPENDED",
      });
    }
    const partner = await prisma.partner.findUnique({
      where: {
        id: partnerId,
      },
    });
    if (!partner) {
      return res.status(404).json({
        message: "Partner not found",
      });
    }
    const updatedPartner = await prisma.partner.update({
      where: {
        id: partnerId,
      },
      data: {
        status,
      },
    });
    const isSuspended = status === "SUSPENDED";
    const title = isSuspended ? "Account Suspended" : "Account Reactivated";
    const message = isSuspended
      ? "Your Partner account has been suspended. Please contact support for more information."
      : "Your Partner account has been reactivated. You can now use your Partner account.";
    const notificationType = isSuspended
      ? "PARTNER_ACCOUNT_SUSPENDED"
      : "PARTNER_ACCOUNT_REACTIVATED";
    const screen = isSuspended ? "AccountSuspended" : "Home";
    const notification = await prisma.notification.create({
      data: {
        partnerId: partnerId,
        title,
        message,
      },
    });
    const partnerTokens = await prisma.deviceToken.findMany({
      where: {
        partnerId: partnerId,
        isActive: true,
      },
    });
    for (const device of partnerTokens) {
      try {
        await sendFcmNotification(device.token, title, message, {
          type: notificationType,
          recipientId: String(partnerId),
          notificationId: String(notification.id),
          screen,
        });
      } catch (error) {
        console.error(`Partner FCM failed for token ${device.id}:`, error);
      }
    }
    return res.json({
      message: isSuspended
        ? "Partner suspended successfully"
        : "Partner activated successfully",
      partner: updatedPartner,
    });
  } catch (error) {
    console.error("Update Partner Status Error:", error);
    return res.status(500).json({
      message: "Failed to update partner status",
    });
  }
});
export default router;
