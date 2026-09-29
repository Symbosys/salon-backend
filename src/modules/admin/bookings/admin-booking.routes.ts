import { Router } from "express";
import prisma from "../../../prisma";

const router = Router();

// Get all bookings
router.get("/", async (_req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        customer: true,
        salon: true,
        service: true,
        staff: true,
        payment: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(bookings);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Get booking by ID
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const booking = await prisma.booking.findUnique({
      where: {
        id,
      },
      include: {
        customer: true,
        salon: true,
        service: true,
        staff: true,
        payment: true,
      },
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    return res.json(booking);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Update booking status
router.patch("/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    const booking = await prisma.booking.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });

    return res.json(booking);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Delete booking
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const booking = await prisma.booking.delete({
      where: {
        id,
      },
    });

    return res.json({
      message: "Booking deleted successfully",
      booking,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;