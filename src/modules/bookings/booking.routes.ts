import { Router } from "express";
import prisma from "../../prisma";

const expireMissedBookings = async () => {
  try {
    const now = new Date();

    // Automatically reject PENDING bookings
    // if salon does not take any action before appointment time.
    const pendingBookings = await prisma.booking.findMany({
      where: {
        status: "PENDING",
      },
    });

    for (const booking of pendingBookings) {
      if (!booking.date || !booking.time) continue;

      const dateOnly = booking.date.toISOString().split("T")[0];

      const appointmentDateTime = new Date(`${dateOnly} ${booking.time}`);

      if (Number.isNaN(appointmentDateTime.getTime())) continue;

      if (now >= appointmentDateTime) {
        await prisma.booking.update({
          where: {
            id: booking.id,
          },
          data: {
            status: "CANCELLED",
            cancelReason: "SALON_NOT_ACCEPTED",
          },
        });

        console.log(
          `Booking ${booking.bookingId} automatically rejected because salon did not accept it.`,
        );
      }
    }

    const bookings = await prisma.booking.findMany({
      where: {
        status: "ACCEPTED",
      },
      include: {
        bookingServices: {
          include: {
            service: true,
          },
        },
      },
    });

    for (const booking of bookings) {
      if (!booking.date || !booking.time) continue;

      const dateOnly = booking.date.toISOString().split("T")[0];

      const appointmentDateTime = new Date(`${dateOnly} ${booking.time}`);

      if (Number.isNaN(appointmentDateTime.getTime())) continue;

      // Total duration of all booked services
      const totalDuration = booking.bookingServices.reduce(
        (total, item) => total + Number(item.service?.duration || 0),
        0,
      );

      // Appointment end time = start time + service duration
      const appointmentEndTime = new Date(
        appointmentDateTime.getTime() + totalDuration * 60 * 1000,
      );

      // Cancel ONLY after complete appointment duration
      // and ONLY if customer has not arrived.
      if (appointmentEndTime < now) {
        await prisma.booking.update({
          where: {
            id: booking.id,
          },
          data: {
            status: "CANCELLED",
            cancelReason: "NOT_ARRIVED",
          },
        });

        await prisma.notification.create({
          data: {
            userId: booking.customerId,
            title: "Booking Cancelled",
            message: `Your booking ${booking.bookingId} was cancelled because the appointment was missed.`,
          },
        });

        console.log(
          `Booking ${booking.bookingId} cancelled because customer did not arrive before appointment ended.`,
        );
      }
    }
  } catch (error) {
    console.error("Expire Missed Bookings Error:", error);
  }
};

const router = Router();

setInterval(() => {
  expireMissedBookings();
}, 60 * 1000);

// ===============================
// CREATE BOOKING
// ===============================
router.post("/", async (req, res) => {
  try {
    const { customerId, salonId, serviceIds, staffId, date, time, discount } =
      req.body;

    // -------------------------------
    // Basic validation
    // -------------------------------
    if (
      !customerId ||
      !salonId ||
      !Array.isArray(serviceIds) ||
      serviceIds.length === 0 ||
      !date ||
      !time
    ) {
      return res.status(400).json({
        message: "customerId, salonId, serviceIds, date and time are required",
      });
    }

    const customerIdNumber = Number(customerId);
    const salonIdNumber = Number(salonId);
    const serviceIdNumbers = serviceIds.map(Number);
    const staffIdNumber = staffId ? Number(staffId) : null;

    if (
      Number.isNaN(customerIdNumber) ||
      Number.isNaN(salonIdNumber) ||
      serviceIdNumbers.some((id) => Number.isNaN(id))
    ) {
      return res.status(400).json({
        message: "Invalid ID provided",
      });
    }

    // -------------------------------
    // Date handling
    // -------------------------------
    const dateOnly = String(date).split("T")[0];

    const startOfDay = new Date(`${dateOnly}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateOnly}T23:59:59.999Z`);

    if (
      Number.isNaN(startOfDay.getTime()) ||
      Number.isNaN(endOfDay.getTime())
    ) {
      return res.status(400).json({
        message: "Invalid date",
      });
    }

    // -------------------------------
    // Transaction
    // -------------------------------
    const booking = await prisma.$transaction(async (tx) => {
      // ===============================
      // 1. Check Salon Live Status
      // ===============================
      const salon = await tx.salon.findUnique({
        where: {
          id: salonIdNumber,
        },
      });

      if (!salon) {
        throw new Error("SALON_NOT_FOUND");
      }

      if (!salon.isLive) {
        throw new Error("SALON_OFFLINE");
      }

      // ===============================
      // 1. Check Services
      // ===============================
      const services = await tx.service.findMany({
        where: {
          id: {
            in: serviceIdNumbers,
          },
          salonId: salonIdNumber,
        },
      });

      if (services.length !== serviceIdNumbers.length) {
        throw new Error("INVALID_SERVICES");
      }

      // ===============================
      // 2. Lock selected availability slot
      // ===============================
      // Only an available slot can be updated.
      // This prevents the same slot from being booked twice.
      const slotUpdate = await tx.availability.updateMany({
        where: {
          salonId: salonIdNumber,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
          time: time,
          isAvailable: true,
        },
        data: {
          isAvailable: false,
        },
      });

      // No available slot found
      if (slotUpdate.count === 0) {
        throw new Error("SLOT_NOT_AVAILABLE");
      }

      // ===============================
      // 3. Calculate amount
      // ===============================
      const amount = services.reduce(
        (total, service) => total + Number(service.price),
        0,
      );

      // Booking fee
      // First service = ₹10
      // Additional service = ₹2 each
      const bookingFee =
        services.length > 0 ? 10 + (services.length - 1) * 2 : 0;

      const finalDiscount = Number(discount || 0);

      const finalAmount = amount + bookingFee - finalDiscount;

      // ===============================
      // 4. Generate Booking ID
      // ===============================
      const bookingId = `BOOK-${Date.now()}`;

      // ===============================
      // 5. Generate QR data
      // ===============================
      const qrCode = JSON.stringify({
        bookingId,
        customerId: customerIdNumber,
        salonId: salonIdNumber,
      });

      // ===============================
      // 6. Create Booking
      // ===============================
      const newBooking = await tx.booking.create({
        data: {
          bookingId,
          qrCode,

          customerId: customerIdNumber,
          salonId: salonIdNumber,

          serviceId: serviceIdNumbers[0],

          staffId: staffIdNumber,

          date: startOfDay,

          time,

          amount,

          bookingFee,

          discount: finalDiscount,

          finalAmount,

          bookingServices: {
            create: services.map((service) => ({
              serviceId: service.id,
            })),
          },
        },

        include: {
          bookingServices: {
            include: {
              service: true,
            },
          },
        },
      });

      await tx.notification.create({
        data: {
          userId: customerIdNumber,
          title: "Booking Confirmed",
          message: `Your booking ${bookingId} has been created successfully.`,
        },
      });

// ===============================
// PARTNER NOTIFICATION
// ===============================

if (salon.partnerId) {
  await tx.notification.create({
    data: {
      partnerId: salon.partnerId,
      title: "New Booking",
      message: `New booking ${bookingId} has been received for your salon.`,
    },
  });

  console.log(
    `Partner notification created for partnerId: ${salon.partnerId}`,
  );
}

return newBooking;
 });

    // ===============================
    // SUCCESS
    // ===============================
    return res.status(201).json({
      message: "Booking created successfully",
      booking,
    });
  } catch (error: any) {
    if (error?.message === "SALON_NOT_FOUND") {
      return res.status(404).json({
        message: "Salon not found",
      });
    }

    if (error?.message === "SALON_OFFLINE") {
      return res.status(400).json({
        message: "This salon is currently offline and not accepting bookings.",
      });
    }

    // Slot already booked
    if (error?.message === "SLOT_NOT_AVAILABLE") {
      return res.status(409).json({
        message:
          "This time slot is no longer available. Please select another slot.",
      });
    }

    // Invalid services
    if (error?.message === "INVALID_SERVICES") {
      return res.status(400).json({
        message: "One or more selected services are invalid for this salon.",
      });
    }

    console.error("Create booking error:", error);

    return res.status(500).json({
      message: "Failed to create booking",
      error: error?.message,
    });
  }
});

// ===============================
// GET BOOKING BY BOOKING ID
// ===============================
router.get("/by-booking-id/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await prisma.booking.findUnique({
      where: {
        bookingId,
      },
      include: {
        customer: true,
        salon: true,
        staff: true,
        bookingServices: {
          include: {
            service: true,
          },
        },
        payment: true,
        reviews: true,
      },
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    return res.json(booking);
  } catch (error: any) {
    console.error("Get booking error:", error);

    return res.status(500).json({
      message: "Failed to fetch booking",
      error: error?.message,
    });
  }
});

router.patch("/customer/:customerId/:bookingId/cancel", async (req, res) => {
  try {
    const customerId = Number(req.params.customerId);
    const bookingId = String(req.params.bookingId).trim();

    if (!Number.isInteger(customerId) || !bookingId) {
      return res.status(400).json({
        message: "Invalid customer or booking ID",
      });
    }

    const booking = await prisma.booking.findFirst({
      where: {
        bookingId,
        customerId,
      },
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    // Customer cancellation ONLY for PENDING
    if (booking.status !== "PENDING") {
      return res.status(400).json({
        message: "Only pending bookings can be cancelled by the customer.",
      });
    }

    if (!booking.date || !booking.time) {
      return res.status(400).json({
        message: "Booking date or time is missing.",
      });
    }

    const dateOnly = booking.date.toISOString().split("T")[0];

    const appointmentDateTime = new Date(`${dateOnly} ${booking.time}`);

    const cancelFrom = new Date(appointmentDateTime.getTime() - 15 * 60 * 1000);

    const now = new Date();

    // Before 15-minute window
    if (now < cancelFrom) {
      return res.status(400).json({
        message: "Cancellation is not available yet.",
      });
    }

    // Appointment time reached
    if (now >= appointmentDateTime) {
      return res.status(400).json({
        message: "The cancellation window for this booking has expired.",
      });
    }

    const updatedBooking = await prisma.$transaction(async (tx) => {
      const cancelled = await tx.booking.update({
        where: {
          id: booking.id,
        },
        data: {
          status: "CANCELLED",
          cancelReason: "SALON_NOT_ACCEPTED",
        },
      });

      await prisma.notification.create({
        data: {
          userId: booking.customerId,
          title: "Booking Cancelled",
          message: `Your booking ${booking.bookingId} was cancelled because the salon did not accept it before the appointment time.`,
        },
      });

      // Release slot
      await tx.availability.updateMany({
        where: {
          salonId: booking.salonId,
          date: {
            gte: new Date(`${dateOnly}T00:00:00.000Z`),
            lte: new Date(`${dateOnly}T23:59:59.999Z`),
          },
          time: booking.time,
        },
        data: {
          isAvailable: true,
        },
      });

      const refundAmount = Number(booking.bookingFee || 0);

      await tx.refund.create({
        data: {
          bookingId: booking.id,
          refundAmount,
          refundReason: "CUSTOMER_CANCELLED",
          refundStatus: "PENDING",
          paymentMethod: null,
          transactionId: null,
          refundedAt: null,
        },
      });

      await tx.notification.create({
        data: {
          userId: booking.customerId,
          title: "Booking Cancelled",
          message: `Your booking ${booking.bookingId} has been cancelled successfully.`,
        },
      });

      return cancelled;
    });

    return res.json({
      message: "Booking cancelled successfully",
      booking: updatedBooking,
      refundAmount: Number(booking.bookingFee || 0),
      refundStatus: "PENDING",
    });
  } catch (error: any) {
    console.error("Customer Cancel Booking Error:", error);

    return res.status(500).json({
      message: "Failed to cancel booking",
      error: error?.message,
    });
  }
});

// ===============================
// GET PARTNER DASHBOARD TODAY STATS
// ===============================
router.get("/partner/:mobile/today-stats", async (req, res) => {
  try {
    const mobile = String(req.params.mobile).trim();

    const partner = await prisma.partner.findUnique({
      where: {
        mobile,
      },
    });

    if (!partner) {
      return res.status(404).json({
        message: "Partner not found",
      });
    }

    const salon = await prisma.salon.findFirst({
      where: {
        partnerId: partner.id,
      },
    });

    if (!salon) {
      return res.status(404).json({
        message: "Salon not found",
      });
    }

    const now = new Date();

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );

    const startOfTomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0,
    );

    // Get today's bookings for this salon
    const bookings = await prisma.booking.findMany({
      where: {
        salonId: salon.id,
        date: {
          gte: startOfToday,
          lt: startOfTomorrow,
        },
      },
    });

    // Total today's bookings
    // Cancelled bookings should not be counted
    const activeBookings = bookings.filter(
      (booking) => booking.status !== "CANCELLED",
    );

    const totalBookings = activeBookings.length;

    // Only PENDING bookings
    const pendingBookings = activeBookings.filter(
      (booking) => booking.status === "PENDING",
    ).length;

    // Only COMPLETED bookings contribute to today's earnings
    // Booking fee is NOT included
    const completedBookings = activeBookings.filter(
      (booking) => booking.status === "COMPLETED",
    );

    const earnings = completedBookings.reduce(
      (total, booking) =>
        total + Number(booking.amount || 0) - Number(booking.discount || 0),
      0,
    );

    return res.json({
      bookings: totalBookings,
      pending: pendingBookings,
      earnings,
    });
  } catch (error: any) {
    console.error("Partner Today Stats Error:", error);

    return res.status(500).json({
      message: "Failed to fetch today's stats",
      error: error?.message,
    });
  }
});

// ===============================
// GET PARTNER TODAY APPOINTMENTS
// ===============================
router.get("/partner/:mobile/today-appointments", async (req, res) => {
  try {
    const mobile = String(req.params.mobile).trim();

    const partner = await prisma.partner.findUnique({
      where: {
        mobile,
      },
    });

    if (!partner) {
      return res.status(404).json({
        message: "Partner not found",
      });
    }

    const salon = await prisma.salon.findFirst({
      where: {
        partnerId: partner.id,
      },
    });

    if (!salon) {
      return res.status(404).json({
        message: "Salon not found",
      });
    }

    const selectedDate = String(req.query.date || "").trim();

    let startOfSelectedDate: Date;
    let endOfSelectedDate: Date;

    if (selectedDate) {
      startOfSelectedDate = new Date(`${selectedDate}T00:00:00+05:30`);

      endOfSelectedDate = new Date(`${selectedDate}T23:59:59.999+05:30`);
    } else {
      const now = new Date();

      const indiaDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
      }).format(now);

      startOfSelectedDate = new Date(`${indiaDate}T00:00:00+05:30`);

      endOfSelectedDate = new Date(`${indiaDate}T23:59:59.999+05:30`);
    }

    if (
      Number.isNaN(startOfSelectedDate.getTime()) ||
      Number.isNaN(endOfSelectedDate.getTime())
    ) {
      return res.status(400).json({
        message: "Invalid date",
      });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        salonId: salon.id,
        date: {
          gte: startOfSelectedDate,
          lte: endOfSelectedDate,
        },
      },
      orderBy: {
        time: "asc",
      },
      include: {
        customer: true,
        staff: true,
        bookingServices: {
          include: {
            service: true,
          },
        },
      },
    });

    return res.json(bookings);
  } catch (error: any) {
    console.error("Partner Today Appointments Error:", error);

    return res.status(500).json({
      message: "Failed to fetch today's appointments",
      error: error?.message,
    });
  }
});

// ===============================
// UPDATE PARTNER BOOKING STATUS
// ===============================
router.patch("/partner/:mobile/:bookingId/status", async (req, res) => {
  try {
    const mobile = String(req.params.mobile).trim();
    const bookingId = String(req.params.bookingId).trim();
    const status = String(req.body.status || "")
      .trim()
      .toUpperCase();

    const allowedStatuses = [
      "PENDING",
      "ACCEPTED",
      "ARRIVED",
      "STARTED",
      "COMPLETED",
      "CANCELLED",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid booking status",
      });
    }

    const partner = await prisma.partner.findUnique({
      where: {
        mobile,
      },
    });

    if (!partner) {
      return res.status(404).json({
        message: "Partner not found",
      });
    }

    const salon = await prisma.salon.findFirst({
      where: {
        partnerId: partner.id,
      },
    });

    if (!salon) {
      return res.status(404).json({
        message: "Salon not found",
      });
    }

    const booking = await prisma.booking.findFirst({
      where: {
        bookingId,
        salonId: salon.id,
      },
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    const updatedBooking = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: {
          id: booking.id,
        },
        data: {
          status,
          cancelReason: status === "CANCELLED" ? "SALON_REJECTED" : null,
        },
      });

      if (status === "ACCEPTED") {
        await tx.notification.create({
          data: {
            userId: booking.customerId,
            title: "Booking Accepted",
            message: `Your booking ${booking.bookingId} has been accepted by the salon.`,
          },
        });
      }

      if (status === "CANCELLED") {
        await tx.notification.create({
          data: {
            userId: booking.customerId,
            title: "Booking Rejected",
            message: `Your booking ${booking.bookingId} has been rejected by the salon.`,
          },
        });
      }

      // Release the booked slot when salon rejects the booking
      if (status === "CANCELLED") {
        await tx.availability.updateMany({
          where: {
            salonId: booking.salonId,
            date: {
              gte: new Date(
                `${booking.date.toISOString().split("T")[0]}T00:00:00.000Z`,
              ),
              lte: new Date(
                `${booking.date.toISOString().split("T")[0]}T23:59:59.999Z`,
              ),
            },
            time: booking.time,
          },
          data: {
            isAvailable: true,
          },
        });

        const existingRefund = await tx.refund.findFirst({
          where: {
            bookingId: booking.id,
          },
        });

        if (!existingRefund) {
          await tx.refund.create({
            data: {
              bookingId: booking.id,
              refundAmount: Number(booking.bookingFee || 0),
              refundReason: "SALON_REJECTED",
              refundStatus: "PENDING",
              paymentMethod: null,
              transactionId: null,
              refundedAt: null,
            },
          });
        }
      }

      return updated;
    });

    return res.json({
      message: "Booking status updated successfully",
      booking: updatedBooking,
    });
  } catch (error: any) {
    console.error("Update Booking Status Error:", error);

    return res.status(500).json({
      message: "Failed to update booking status",
      error: error?.message,
    });
  }
});

// ===============================
// GET PARTNER EARNINGS
// ===============================
router.get("/partner/:mobile/monthly-earnings", async (req, res) => {
  try {
    const mobile = String(req.params.mobile).trim();

    // Find partner
    const partner = await prisma.partner.findUnique({
      where: {
        mobile,
      },
    });

    if (!partner) {
      return res.status(404).json({
        message: "Partner not found",
      });
    }

    // Find partner's salon
    const salon = await prisma.salon.findFirst({
      where: {
        partnerId: partner.id,
      },
    });

    if (!salon) {
      return res.status(404).json({
        message: "Salon not found",
      });
    }

    const now = new Date();

    // Start of current month
    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );

    // Start of next month
    const startOfNextMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1,
      0,
      0,
      0,
      0,
    );

    // Start of today
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );

    // Start of tomorrow
    const startOfTomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0,
    );

    // Completed bookings of current month
    const completedBookings = await prisma.booking.findMany({
      where: {
        salonId: salon.id,
        status: "COMPLETED",
        date: {
          gte: startOfMonth,
          lt: startOfNextMonth,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        customer: true,
        bookingServices: {
          include: {
            service: true,
          },
        },
      },
    });

    // This Month
    const monthlyEarnings = completedBookings.reduce(
      (total, booking) =>
        total + Number(booking.amount || 0) - Number(booking.discount || 0),
      0,
    );

    // Completed count
    const completedCount = completedBookings.length;

    // Today's completed bookings
    const todayBookings = completedBookings.filter((booking) => {
      const bookingDate = new Date(booking.date);

      return bookingDate >= startOfToday && bookingDate < startOfTomorrow;
    });

    const todayEarnings = todayBookings.reduce(
      (total, booking) =>
        total + Number(booking.amount || 0) - Number(booking.discount || 0),
      0,
    );

    // Pending settlements
    const pendingSettlements = await prisma.settlement.findMany({
      where: {
        salonId: salon.id,
        status: "PENDING",
      },
    });

    const pendingSettlementAmount = pendingSettlements.reduce(
      (total, settlement) => total + Number(settlement.partnerAmount || 0),
      0,
    );

    // Recent earnings
    const recentEarnings = completedBookings.slice(0, 10).map((booking) => {
      const firstService = booking.bookingServices?.[0]?.service;

      return {
        id: booking.id,
        bookingId: booking.bookingId,
        service: firstService?.name || "Service",
        customer: booking.customer?.name || "Customer",
        date: booking.date,
        amount: Number(booking.amount || 0) - Number(booking.discount || 0),
      };
    });

    return res.json({
      monthlyEarnings,
      completedCount,
      todayEarnings,
      pendingSettlementAmount,
      recentEarnings,
    });
  } catch (error: any) {
    console.error("Partner Earnings Error:", error);

    return res.status(500).json({
      message: "Failed to fetch partner earnings",
      error: error?.message,
    });
  }
});

// ===============================
// GET CUSTOMER BOOKINGS
// ===============================
router.get("/customer/:customerId", async (req, res) => {
  try {
    const customerId = Number(req.params.customerId);

    if (Number.isNaN(customerId)) {
      return res.status(400).json({
        message: "Invalid customer ID",
      });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        customerId,
      },

      orderBy: {
        createdAt: "desc",
      },

      include: {
        salon: true,
        staff: true,

        bookingServices: {
          include: {
            service: true,
          },
        },

        payment: true,

        reviews: true,
      },
    });

    return res.json(bookings);
  } catch (error: any) {
    console.error("Get customer bookings error:", error);

    return res.status(500).json({
      message: "Failed to fetch customer bookings",
      error: error?.message,
    });
  }
});

router.post("/partner/:mobile/verify-qr", async (req, res) => {
  try {
    const mobile = String(req.params.mobile).trim();
    const { qrCode } = req.body;

    if (!mobile || !qrCode) {
      return res.status(400).json({
        message: "Partner mobile and QR code are required",
      });
    }

    // Verify partner
    const partner = await prisma.partner.findUnique({
      where: { mobile },
    });

    if (!partner) {
      return res.status(404).json({
        message: "Partner not found",
      });
    }

    // Get partner's salon
    const salon = await prisma.salon.findFirst({
      where: { partnerId: partner.id },
    });

    if (!salon) {
      return res.status(404).json({
        message: "Salon not found",
      });
    }

    // Read QR data
    let qrData: {
      bookingId?: string;
      customerId?: number;
      salonId?: number;
    };

    try {
      qrData = JSON.parse(qrCode);
    } catch {
      return res.status(400).json({
        message: "Invalid QR code",
      });
    }

    if (!qrData.bookingId || !qrData.customerId || !qrData.salonId) {
      return res.status(400).json({
        message: "Invalid QR code data",
      });
    }

    // Make sure QR belongs to this salon
    if (Number(qrData.salonId) !== salon.id) {
      return res.status(403).json({
        message: "This QR code does not belong to your salon",
      });
    }

    // Find booking
    const booking = await prisma.booking.findFirst({
      where: {
        bookingId: qrData.bookingId,
        customerId: Number(qrData.customerId),
        salonId: salon.id,
      },
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found for this QR code",
      });
    }

    // QR can complete only a started booking
    if (booking.status !== "STARTED") {
      return res.status(400).json({
        message: `Booking cannot be completed. Current status is ${booking.status}`,
      });
    }

    // Complete booking
    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "COMPLETED",
      },
    });

    return res.json({
      message: "QR verified and booking completed successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Verify Customer QR Error:", error);

    return res.status(500).json({
      message: "Something went wrong while verifying QR code",
    });
  }
});

export default router;
