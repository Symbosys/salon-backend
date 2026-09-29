import { Router } from "express";
import prisma from "../../../prisma";

const router = Router();

// Get all notifications
router.get("/", async (_req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      include: {
        user: true,
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