import { Router } from "express";
import prisma from "../../../prisma";

const router = Router();

// Get all reviews
router.get("/", async (_req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      include: {
        customer: true,
        salon: true,
        booking: true,
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

// Get review by ID
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const review = await prisma.review.findUnique({
      where: {
        id,
      },
      include: {
        customer: true,
        salon: true,
        booking: true,
      },
    });

    if (!review) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    return res.json(review);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Delete review
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const review = await prisma.review.delete({
      where: {
        id,
      },
    });

    return res.json({
      message: "Review deleted successfully",
      review,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;