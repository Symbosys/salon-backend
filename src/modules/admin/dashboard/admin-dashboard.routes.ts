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

      // Booking Overview
      pendingBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,

      // Recent Activity
      recentBookings,
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

      // ===============================
      // BOOKING OVERVIEW
      // ===============================

      prisma.booking.count({
        where: {
          status: "PENDING",
        },
      }),

      prisma.booking.count({
        where: {
          status: "CONFIRMED",
        },
      }),

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

      // ===============================
      // RECENT ACTIVITY
      // ===============================

      prisma.booking.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
        include: {
          customer: true,
          salon: true,
        },
      }),
    ]);

    return res.json({
      // ===============================
      // TOP STATS
      // ===============================

      totalCustomers,
      totalSalons,
      totalBookings,
      totalServices,
      totalPayments,
      totalReviews,
      totalOffers,

      totalRevenue: revenueResult._sum.amount || 0,

      totalCommission:
        commissionResult._sum.commission || 0,

      totalPartnerEarnings:
        partnerEarningsResult._sum.partnerAmount || 0,

      pendingSettlements:
        pendingSettlementResult._sum.amount || 0,

      // ===============================
      // BOOKING OVERVIEW
      // ===============================

      bookingOverview: {
        pending: pendingBookings,
        confirmed: confirmedBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
      },

      // ===============================
      // RECENT ACTIVITY
      // ===============================

      recentActivity: recentBookings.map((booking) => ({
        id: booking.id,
        bookingId: booking.bookingId,
        customerName:
          booking.customer?.name || "Customer",
        salonName:
          booking.salon?.name || "Salon",
        status: booking.status,
        amount: Number(booking.finalAmount || 0),
        createdAt: booking.createdAt,
      })),
    });
  } catch (error) {
    console.error("Admin Dashboard Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;