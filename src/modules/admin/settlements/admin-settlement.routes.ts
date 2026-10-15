import { Router } from "express";
import prisma from "../../../prisma";
const router = Router();
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
    const formattedSettlements = settlements.map((settlement) => {
      const amount = Number(settlement.amount || 0);
      const commission = Number(settlement.commission || 0);
      const partnerAmount = Number(settlement.partnerAmount || 0);
      return {
        ...settlement,
        settlementId: `SET${String(settlement.id).padStart(4, "0")}`,
        salonName: settlement.salon?.name || "-",
        amount,
        commission,
        partnerAmount,
        bookingCount: settlement.bookingId ? 1 : 0,
        date: settlement.createdAt,
        status: settlement.status,
      };
    });
    return res.json(formattedSettlements);
  } catch (error) {
    console.error("Admin Settlements Error:", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});
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
