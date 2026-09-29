import { Router } from "express";
import prisma from "../../../prisma";

const router = Router();

// Get all offers
router.get("/", async (_req, res) => {
  try {
    const offers = await prisma.offer.findMany({
      include: {
        salon: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(offers);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Get offer by ID
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const offer = await prisma.offer.findUnique({
      where: {
        id,
      },
      include: {
        salon: true,
      },
    });

    if (!offer) {
      return res.status(404).json({
        message: "Offer not found",
      });
    }

    return res.json(offer);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Update offer
router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const {
      title,
      description,
      discount,
      isActive,
    } = req.body;

    const offer = await prisma.offer.update({
      where: {
        id,
      },
      data: {
        title,
        description,
        discount,
        isActive,
      },
    });

    return res.json(offer);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Delete offer
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const offer = await prisma.offer.delete({
      where: {
        id,
      },
    });

    return res.json({
      message: "Offer deleted successfully",
      offer,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;