import { Router } from "express";
import prisma from "../../prisma";

const router = Router();

// Create Review
router.post("/", async (req, res) => {
  try {
    const {
      bookingId,
      customerId,
      salonId,
      rating,
      comment,
    } = req.body;

    if (!bookingId || !customerId || !salonId || rating === undefined) {
      return res.status(400).json({
        message: "Required review details are missing",
      });
    }

    if (Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5",
      });
    }

    const review = await prisma.review.create({
      data: {
        bookingId: Number(bookingId),
        customerId: Number(customerId),
        salonId: Number(salonId),
        rating: Number(rating),
        comment,
      },
    });

    return res.status(201).json({
      message: "Review created successfully",
      review,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Get Reviews by Salon
router.get("/:salonId", async (req, res) => {
  try {
    const salonId = Number(req.params.salonId);

    const reviews = await prisma.review.findMany({
      where: {
        salonId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(reviews);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;