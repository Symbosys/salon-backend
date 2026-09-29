import { Router } from "express";
import prisma from "../../../prisma";

const router = Router();

// Get all payments
router.get("/", async (_req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        booking: {
          include: {
            customer: true,
            salon: true,
            service: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(payments);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Get payment by ID
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const payment = await prisma.payment.findUnique({
      where: {
        id,
      },
      include: {
        booking: true,
      },
    });

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found",
      });
    }

    return res.json(payment);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Update payment status
router.patch("/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, transactionId } = req.body;

    const payment = await prisma.payment.update({
      where: {
        id,
      },
      data: {
        status,
        transactionId,
      },
    });

    return res.json(payment);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Delete payment
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const payment = await prisma.payment.delete({
      where: {
        id,
      },
    });

    return res.json({
      message: "Payment deleted successfully",
      payment,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;