import { Router } from "express";
import prisma from "../../prisma";

const router = Router();

// ==================================================
// REGISTER FCM DEVICE TOKEN
// ==================================================
router.post("/device-token", async (req, res) => {
  try {
    const {
      token,
      platform,
      deviceType,
      userId,
      partnerId,
      adminId,
    } = req.body;

    if (!token || !platform) {
      return res.status(400).json({
        message: "FCM token and platform are required",
      });
    }

    const recipientCount = [userId, partnerId, adminId].filter(
      (id) => id !== undefined && id !== null,
    ).length;

    if (recipientCount !== 1) {
      return res.status(400).json({
        message:
          "Exactly one recipient is required: userId, partnerId or adminId",
      });
    }

    const deviceToken = await prisma.deviceToken.upsert({
      where: {
        token: String(token),
      },
      update: {
        platform: String(platform),
        deviceType: deviceType ? String(deviceType) : null,
        userId: userId ? Number(userId) : null,
        partnerId: partnerId ? Number(partnerId) : null,
        adminId: adminId ? Number(adminId) : null,
        isActive: true,
      },
      create: {
        token: String(token),
        platform: String(platform),
        deviceType: deviceType ? String(deviceType) : null,
        userId: userId ? Number(userId) : null,
        partnerId: partnerId ? Number(partnerId) : null,
        adminId: adminId ? Number(adminId) : null,
        isActive: true,
      },
    });

    return res.status(200).json({
      message: "FCM device token registered successfully",
      deviceToken,
    });
  } catch (error) {
    console.error("Register FCM Device Token Error:", error);

    return res.status(500).json({
      message: "Failed to register FCM device token",
    });
  }
});

// Create notification
router.post("/", async (req, res) => {
  try {
    const { userId, title, message } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({
        message: "Required notification details are missing",
      });
    }

    const notification = await prisma.notification.create({
      data: {
        userId: Number(userId),
        title,
        message,
      },
    });

    return res.status(201).json({
      message: "Notification created successfully",
      notification,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// ==================================================
// GET PARTNER NOTIFICATIONS
// ==================================================
router.get("/partner/:mobile", async (req, res) => {
  try {
    const mobile = String(req.params.mobile).trim();

    if (!mobile) {
      return res.status(400).json({
        message: "Partner mobile number is required",
      });
    }

    const partner = await prisma.partner.findUnique({
      where: {
        mobile,
      },
    });

    if (!partner) {
      return res.status(404).json({
        message: "Partner not found",
      });
    }

    const notifications = await prisma.notification.findMany({
      where: {
        partnerId: partner.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(notifications);
  } catch (error) {
    console.error("Get Partner Notifications Error:", error);

    return res.status(500).json({
      message: "Failed to fetch partner notifications",
    });
  }
});

// Get notifications by user
router.get("/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(notifications);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Mark notification as read
router.patch("/:id/read", async (req, res) => {
  try {
    const notificationId = Number(req.params.id);

    if (!notificationId) {
      return res.status(400).json({
        message: "Invalid notification ID",
      });
    }

    const notification = await prisma.notification.update({
      where: {
        id: notificationId,
      },
      data: {
        isRead: true,
      },
    });

    return res.json({
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;