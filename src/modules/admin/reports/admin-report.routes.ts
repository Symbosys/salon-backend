import { Router } from "express";
import prisma from "../../../prisma";

const router = Router();

// Get admin reports
router.get("/", async (_req, res) => {
  try {
    const [
      totalBookings,
      completedBookings,
      cancelledBookings,
      revenueResult,
      commissionResult,
      partnerEarningsResult,
    ] = await Promise.all([
      prisma.booking.count(),

      prisma.booking.count({
        where: {
          status: "COMPLETED",
        },
      }),

      prisma.booking.count({
        where: {
          status: "CANCELLED",
        },
      }),

      prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: "SUCCESS",
        },
      }),

      prisma.settlement.aggregate({
        _sum: {
          commission: true,
        },
      }),

      prisma.settlement.aggregate({
        _sum: {
          partnerAmount: true,
        },
      }),
    ]);

    return res.json({
      totalBookings,
      completedBookings,
      cancelledBookings,
      totalRevenue: revenueResult._sum.amount || 0,
      totalCommission: commissionResult._sum.commission || 0,
      totalPartnerEarnings:
        partnerEarningsResult._sum.partnerAmount || 0,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;