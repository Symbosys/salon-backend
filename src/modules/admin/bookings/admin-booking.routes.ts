import { Router } from "express";
import prisma from "../../../prisma";
import { sendFcmNotification } from "../../../services/fcm.service";

const router = Router();

// Get all bookings
router.get("/", async (_req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        customer: true,
        salon: {
  include: {
    partner: true,
    owner: true,
  },
},
        service: true,
        staff: true,
        payment: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(bookings);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Get booking by ID
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const booking = await prisma.booking.findUnique({
      where: {
        id,
      },
      include: {
        customer: true,
        salon: {
  include: {
    partner: true,
    owner: true,
  },
},
        service: true,
        staff: true,
        payment: true,
      },
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    return res.json(booking);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Update booking status
router.patch("/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    const existingBooking = await prisma.booking.findUnique({
      where: {
        id,
      },
      include: {
        salon: true,
        customer: true,
      },
    });

    if (!existingBooking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    const booking = await prisma.booking.update({
      where: {
        id,
      },
      data: {
        status,

        cancelledAt:
          status === "CANCELLED"
            ? new Date()
            : undefined,

        cancelReason:
          status === "CANCELLED"
            ? "Admin cancelled"
            : undefined,
      },
    });

    
    // Release the slot when admin cancels a booking
    if (
      status === "CANCELLED" &&
      existingBooking.status !== "CANCELLED"
    ) {
      const bookingDate = new Date(existingBooking.date);

      const startOfDay = new Date(bookingDate);
      startOfDay.setUTCHours(0, 0, 0, 0);

      const endOfDay = new Date(startOfDay);
      endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

      // Check whether another active booking uses this slot
      const otherActiveBooking = await prisma.booking.findFirst({
        where: {
          id: { not: existingBooking.id },
          salonId: existingBooking.salonId,
          date: {
            gte: startOfDay,
            lt: endOfDay,
          },
          time: existingBooking.time,
          status: {
            notIn: ["CANCELLED", "REJECTED"],
          },
        },
      });

      // Release only when no other active booking uses it
      if (!otherActiveBooking) {
        await prisma.availability.updateMany({
          where: {
            salonId: existingBooking.salonId,
            date: {
              gte: startOfDay,
              lt: endOfDay,
            },
            time: existingBooking.time,
          },
          data: {
            isAvailable: true,
          },
        });
      }
    }


    // ===============================
    // BOOKING CANCELLED BY ADMIN
    // ===============================

    if (status === "CANCELLED") {
      const salonName =
        existingBooking.salon?.name || "the salon";

      const customerNotification =
        await prisma.notification.create({
          data: {
            userId: existingBooking.customerId,
            title: "Booking Cancelled",
            message: `Your booking at ${salonName} has been cancelled by the administrator.`,
          },
        });

      // Customer FCM
      const customerTokens =
        await prisma.deviceToken.findMany({
          where: {
            userId: existingBooking.customerId,
            isActive: true,
          },
        });

      for (const device of customerTokens) {
        try {
          await sendFcmNotification(
            device.token,
            "Booking Cancelled",
            `Your booking at ${salonName} has been cancelled by the administrator.`,
            {
              type: "BOOKING_CANCELLED_BY_ADMIN",
              recipientId: String(existingBooking.customerId),
              bookingId: String(existingBooking.bookingId),
              salonId: String(existingBooking.salonId),
              notificationId: String(customerNotification.id),
              screen: "BookingDetails",
            },
          );
        } catch (error) {
          console.error(
            `Customer FCM failed for token ${device.id}:`,
            error,
          );
        }
      }

      // Partner notification
      if (existingBooking.salon?.partnerId) {
        const partnerNotification =
          await prisma.notification.create({
            data: {
              partnerId: existingBooking.salon.partnerId,
              title: "Booking Cancelled",
              message: `The booking for ${existingBooking.customer?.name || "Customer"} has been cancelled by the administrator.`,
            },
          });

        // Partner FCM
        const partnerTokens =
          await prisma.deviceToken.findMany({
            where: {
              partnerId: existingBooking.salon.partnerId,
              isActive: true,
            },
          });

        for (const device of partnerTokens) {
          try {
            await sendFcmNotification(
              device.token,
              "Booking Cancelled",
              `The booking for ${existingBooking.customer?.name || "Customer"} has been cancelled by the administrator.`,
              {
                type: "BOOKING_CANCELLED_BY_ADMIN",
                recipientId: String(
                  existingBooking.salon.partnerId,
                ),
                bookingId: String(
                  existingBooking.bookingId,
                ),
                salonId: String(
                  existingBooking.salonId,
                ),
                notificationId: String(
                  partnerNotification.id,
                ),
                screen: "BookingDetails",
              },
            );
          } catch (error) {
            console.error(
              `Partner FCM failed for token ${device.id}:`,
              error,
            );
          }
        }
      }
    }

    return res.json(booking);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Delete booking
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const booking = await prisma.booking.delete({
      where: {
        id,
      },
    });

    return res.json({
      message: "Booking deleted successfully",
      booking,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;