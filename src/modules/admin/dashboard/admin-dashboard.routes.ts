import { Router } from "express";
import prisma from "../../../prisma";

const router = Router();

// Get admin dashboard summary
router.get("/", async (_req, res) => {
  try {
    const [
      totalCustomers,
      totalSalons,
      totalBookings,
      totalServices,
      totalPayments,
      totalReviews,
      totalOffers,
      revenueResult,
      commissionResult,
      partnerEarningsResult,
      pendingSettlementResult,
    ] = await Promise.all([
      prisma.user.count({
        where: {
          role: "CUSTOMER",
        },
      }),

      prisma.salon.count(),

      prisma.booking.count(),

      prisma.service.count(),

      prisma.payment.count(),

      prisma.review.count(),

      prisma.offer.count(),

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

      prisma.settlement.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: "PENDING",
        },
      }),
    ]);

    return res.json({
      totalCustomers,
      totalSalons,
      totalBookings,
      totalServices,
      totalPayments,
      totalReviews,
      totalOffers,

      totalRevenue: revenueResult._sum.amount || 0,
      totalCommission: commissionResult._sum.commission || 0,
      totalPartnerEarnings:
        partnerEarningsResult._sum.partnerAmount || 0,
      pendingSettlements:
        pendingSettlementResult._sum.amount || 0,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;