import { Router } from "express";
import prisma from "../../prisma";

const router = Router();

// Create Payment
router.post("/", async (req, res) => {
  try {
    const {
      bookingId,
      amount,
      paymentMethod,
    } = req.body;

    if (!bookingId || !amount || !paymentMethod) {
      return res.status(400).json({
        message: "Required payment details are missing",
      });
    }

    const booking = await prisma.booking.findUnique({
      where: {
        id: Number(bookingId),
      },
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    const payment = await prisma.payment.create({
      data: {
        bookingId: Number(bookingId),
        amount: Number(amount),
        paymentMethod,
        status: "SUCCESS",
        transactionId: `TXN-${Date.now()}`,
      },
    });

    return res.status(201).json({
      message: "Payment successful",
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