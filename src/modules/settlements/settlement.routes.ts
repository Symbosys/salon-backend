import { Router } from "express";
import prisma from "../../prisma";

const router = Router();

// Create Settlement
router.post("/", async (req, res) => {
  try {
    const {
      bookingId,
      salonId,
      amount,
      commission,
    } = req.body;

    if (
      !bookingId ||
      !salonId ||
      amount === undefined ||
      commission === undefined
    ) {
      return res.status(400).json({
        message: "Required settlement details are missing",
      });
    }

    const partnerAmount =
      Number(amount) - Number(commission);

    const settlement = await prisma.settlement.create({
      data: {
        bookingId: Number(bookingId),
        salonId: Number(salonId),
        amount: Number(amount),
        commission: Number(commission),
        partnerAmount,
        status: "PENDING",
      },
    });

    return res.status(201).json({
      message: "Settlement created successfully",
      settlement,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Get Settlements by Salon
router.get("/:salonId", async (req, res) => {
  try {
    const salonId = Number(req.params.salonId);

    const settlements = await prisma.settlement.findMany({
      where: {
        salonId,
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

export default router;