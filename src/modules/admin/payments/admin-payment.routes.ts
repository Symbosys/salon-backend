import { Router } from "express";
import prisma from "../../../prisma";
const router = Router();
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
    const formattedPayments = payments.map((payment) => {
      const booking = payment.booking;
      const amount = Number(booking.amount || 0);
      const bookingFee = Number(booking.bookingFee || 0);
      const discount = Number(booking.discount || 0);
      const totalPaid = Number(booking.finalAmount || 0);
      const salonAmount = amount - discount;
      return {
        ...payment,
        amount,
        bookingFee,
        discount,
        salonAmount,
        totalPaid,
        booking: {
          ...booking,
          amount,
          bookingFee,
          discount,
          finalAmount: totalPaid,
        },
      };
    });
    return res.json(formattedPayments);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const payment = await prisma.payment.findUnique({
      where: {
        id,
      },
      include: {
        booking: {
          include: {
            customer: true,
            salon: true,
            service: true,
          },
        },
      },
    });
    if (!payment) {
      return res.status(404).json({
        message: "Payment not found",
      });
    }
    const booking = payment.booking;
    const amount = Number(booking.amount || 0);
    const bookingFee = Number(booking.bookingFee || 0);
    const discount = Number(booking.discount || 0);
    const salonAmount = amount - discount;
    const totalPaid = Number(booking.finalAmount || 0);
    return res.json({
      ...payment,
      salonAmount,
      bookingFee,
      discount,
      totalPaid,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});
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
