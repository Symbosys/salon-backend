import { Router } from "express";
import prisma from "../../../prisma";

const router = Router();

// Get admin reports
router.get("/", async (req, res) => {
  try {
    const months = Number(req.query.months) || 6;

    const validMonths = [3, 6, 12];
    const selectedMonths = validMonths.includes(months) ? months : 6;

    const now = new Date();

    const startDate = new Date(
      now.getFullYear(),
      now.getMonth() - selectedMonths + 1,
      1
    );

    const previousStartDate = new Date(
      now.getFullYear(),
      now.getMonth() - selectedMonths * 2 + 1,
      1
    );

    const [
      totalCustomers,
      totalSalons,
      totalBookings,
      completedBookings,
      cancelledBookings,
      pendingBookings,
      confirmedBookings,
      revenueResult,
      commissionResult,
      partnerEarningsResult,
      bookingAmountResult,
      previousBookings,
      previousCustomers,
      previousRevenueResult,
      monthlyBookingsRaw,
      monthlyRevenueRaw,
      topSalonsRaw,
    ] = await Promise.all([
      // ================= SUMMARY =================

      prisma.user.count({
        where: {
          role: "CUSTOMER",
        },
      }),

      prisma.salon.count(),

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

      // Average booking value
      prisma.booking.aggregate({
        _avg: {
          finalAmount: true,
        },
        where: {
          createdAt: {
            gte: startDate,
          },
        },
      }),

      // ================= PREVIOUS PERIOD =================

      prisma.booking.count({
        where: {
          createdAt: {
            gte: previousStartDate,
            lt: startDate,
          },
        },
      }),

      prisma.user.count({
        where: {
          role: "CUSTOMER",
          createdAt: {
            gte: previousStartDate,
            lt: startDate,
          },
        },
      }),

      prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: "SUCCESS",
          createdAt: {
            gte: previousStartDate,
            lt: startDate,
          },
        },
      }),

      // ================= MONTHLY BOOKINGS =================

      prisma.booking.findMany({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),

      // ================= MONTHLY REVENUE =================

      prisma.payment.findMany({
        where: {
          status: "SUCCESS",
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          amount: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),

      // ================= TOP SALONS =================

      prisma.booking.groupBy({
        by: ["salonId"],
        where: {
          createdAt: {
            gte: startDate,
          },
        },
        _count: {
          id: true,
        },
        _sum: {
          finalAmount: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
        take: 5,
      }),
    ]);

    // =====================================================
    // MONTH HELPERS
    // =====================================================

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const monthlyBookings = [];
    const monthlyRevenue = [];

    for (let i = selectedMonths - 1; i >= 0; i--) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );

      const year = date.getFullYear();
      const month = date.getMonth();

      const bookingCount = monthlyBookingsRaw.filter((booking) => {
        const bookingDate = new Date(booking.createdAt);

        return (
          bookingDate.getFullYear() === year &&
          bookingDate.getMonth() === month
        );
      }).length;

      const revenue = monthlyRevenueRaw
        .filter((payment) => {
          const paymentDate = new Date(payment.createdAt);

          return (
            paymentDate.getFullYear() === year &&
            paymentDate.getMonth() === month
          );
        })
        .reduce((total, payment) => {
          return total + Number(payment.amount || 0);
        }, 0);

      monthlyBookings.push({
        month: monthNames[month],
        bookings: bookingCount,
      });

      monthlyRevenue.push({
        month: monthNames[month],
        revenue,
      });
    }

    // =====================================================
    // TOP SALONS
    // =====================================================

    const topSalonIds = topSalonsRaw.map((item) => item.salonId);

    const salons = await prisma.salon.findMany({
      where: {
        id: {
          in: topSalonIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const topSalons = topSalonsRaw.map((item) => {
      const salon = salons.find(
        (itemSalon) => itemSalon.id === item.salonId
      );

      return {
        salonId: item.salonId,
        salon: salon?.name || "Unknown Salon",
        bookings: item._count.id,
        revenue: Number(item._sum.finalAmount || 0),
      };
    });

    // =====================================================
    // GROWTH CALCULATIONS
    // =====================================================

    const currentRevenue = Number(
      revenueResult._sum.amount || 0
    );

    const previousRevenue = Number(
      previousRevenueResult._sum.amount || 0
    );

    const calculateGrowth = (
  current: number,
  previous: number
): number => {
      if (!previous) {
        return current > 0 ? 100 : 0;
      }

      return Number(
        (((current - previous) / previous) * 100).toFixed(1)
      );
    };

    const bookingGrowth = calculateGrowth(
      totalBookings,
      previousBookings
    );

    const customerGrowth = calculateGrowth(
      totalCustomers,
      previousCustomers
    );

    const revenueGrowth = calculateGrowth(
      currentRevenue,
      previousRevenue
    );

    // =====================================================
    // RESPONSE
    // =====================================================

    return res.json({
      // Existing fields
      totalBookings,
      completedBookings,
      cancelledBookings,

      totalRevenue: currentRevenue,

      totalCommission:
        commissionResult._sum.commission || 0,

      totalPartnerEarnings:
        partnerEarningsResult._sum.partnerAmount || 0,

      // New summary fields
      totalCustomers,
      totalSalons,

      pendingBookings,
      confirmedBookings,

      averageBookingValue:
        Number(
          bookingAmountResult._avg.finalAmount || 0
        ).toFixed(2),

      // Growth
      bookingGrowth,
      customerGrowth,
      revenueGrowth,

      // Charts
      monthlyBookings,
      monthlyRevenue,

      // Top salons
      topSalons,
    });
  } catch (error) {
    console.error("Admin reports error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;