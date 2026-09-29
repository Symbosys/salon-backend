import { Router } from "express";
import prisma from "../../prisma";

const router = Router();

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