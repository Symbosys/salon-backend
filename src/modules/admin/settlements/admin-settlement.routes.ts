import { Router } from "express";
import prisma from "../../../prisma";

const router = Router();

// Get all settlements
router.get("/", async (_req, res) => {
  try {
    const settlements = await prisma.settlement.findMany({
      include: {
        salon: true,
        booking: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(settlements);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Get settlement by ID
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const settlement = await prisma.settlement.findUnique({
      where: {
        id,
      },
      include: {
        salon: true,
        booking: true,
      },
    });

    if (!settlement) {
      return res.status(404).json({
        message: "Settlement not found",
      });
    }

    return res.json(settlement);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Update settlement status
router.patch("/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    const settlement = await prisma.settlement.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });

    return res.json(settlement);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;