import { Router } from "express";
import prisma from "../../../prisma";

const router = Router();

// Get Admin notifications
router.get("/", async (req, res) => {
  try {
    const adminId = Number(req.query.adminId);

    if (!adminId || Number.isNaN(adminId)) {
      return res.status(400).json({
        message: "Valid adminId is required",
      });
    }

    const notifications = await prisma.notification.findMany({
      where: { adminId },
      include: {
        user: true,
        partner: true,
        admin: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(notifications);
  } catch (error) {
    console.error("Admin notifications error:", error);

    return res.status(500).json({
      message: "Failed to fetch notifications",
    });
  }
});

// Get notification by ID
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const notification = await prisma.notification.findUnique({
      where: {
        id,
      },
      include: {
  user: true,
  partner: true,
  admin: true,
},
    });

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    return res.json(notification);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Send notification
router.post("/", async (req, res) => {
  try {
    const {
      userId,
      title,
      message,
    } = req.body;

    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
      },
    });

    return res.status(201).json({
      message: "Notification sent successfully",
      notification,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Mark notification as read/unread
router.patch("/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { isRead } = req.body;

    const notification = await prisma.notification.update({
      where: {
        id,
      },
      data: {
        isRead,
      },
    });

    return res.json(notification);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Delete notification
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const notification = await prisma.notification.delete({
      where: {
        id,
      },
    });

    return res.json({
      message: "Notification deleted successfully",
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