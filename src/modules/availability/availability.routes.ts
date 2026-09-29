import { Router } from "express";
import prisma from "../../prisma";

const router = Router();

// Get available slots of a salon
router.get("/:salonId", async (req, res) => {
  try {
    const salonId = Number(req.params.salonId);

    if (!Number.isInteger(salonId) || salonId <= 0) {
      return res.status(400).json({
        message: "Valid salon ID is required",
      });
    }

    const SLOT_INTERVAL = 30;
    const OPEN_TIME = 9 * 60;   // 09:00 AM
    const CLOSE_TIME = 20 * 60; // 08:00 PM
    const TOTAL_DAYS = 30;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const slotsToCreate = [];

    for (let day = 0; day < TOTAL_DAYS; day++) {
      const slotDate = new Date(today);
      slotDate.setDate(today.getDate() + day);

      for (
        let minutes = OPEN_TIME;
        minutes < CLOSE_TIME;
        minutes += SLOT_INTERVAL
      ) {
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;

        const period = hour >= 12 ? "PM" : "AM";
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        const displayMinute = String(minute).padStart(2, "0");

        const time = `${String(displayHour).padStart(
          2,
          "0"
        )}:${displayMinute} ${period}`;

        slotsToCreate.push({
          salonId,
          date: new Date(slotDate),
          time,
          isAvailable: true,
        });
      }
    }

    const existingSlots = await prisma.availability.findMany({
      where: {
        salonId,
        date: {
          gte: today,
        },
      },
    });

    const existingKeys = new Set(
      existingSlots.map(
        (slot) =>
          `${slot.date.toISOString().split("T")[0]}_${slot.time}`
      )
    );

    const newSlots = slotsToCreate.filter(
      (slot) =>
        !existingKeys.has(
          `${slot.date.toISOString().split("T")[0]}_${slot.time}`
        )
    );

    if (newSlots.length > 0) {
      await prisma.availability.createMany({
        data: newSlots,
      });
    }

    const slots = await prisma.availability.findMany({
  where: {
    salonId,
    date: {
      gte: today,
    },
  },
  orderBy: {
    date: "asc",
  },
});

const bookings = await prisma.booking.findMany({
  where: {
    salonId,
    date: {
      gte: today,
    },
    status: {
      not: "CANCELLED",
    },
  },
  select: {
    date: true,
    time: true,
  },
});

const getDateKey = (date: Date) => {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const bookedKeys = new Set(
  bookings.map(
    (booking) =>
      `${getDateKey(booking.date)}_${booking.time}`
  )
);

const result = slots.map((slot) => {
  const key = `${getDateKey(slot.date)}_${slot.time}`;

  let status = "Unavailable";

  if (bookedKeys.has(key)) {
    status = "Booked";
  } else if (slot.isAvailable) {
    status = "Available";
  }

  return {
    ...slot,
    status,
  };
});

result.sort((a, b) => {
  const convertToMinutes = (time: string) => {
    const [timePart, period] = time.split(" ");
    let [hour, minute] = timePart.split(":").map(Number);

    if (period === "PM" && hour !== 12) {
      hour += 12;
    }

    if (period === "AM" && hour === 12) {
      hour = 0;
    }

    return hour * 60 + minute;
  };

  return convertToMinutes(a.time) - convertToMinutes(b.time);
});

return res.json(result);

slots.sort((a, b) => {
  const convertToMinutes = (time: string) => {
    const [timePart, period] = time.split(" ");
    let [hour, minute] = timePart.split(":").map(Number);

    if (period === "PM" && hour !== 12) {
      hour += 12;
    }

    if (period === "AM" && hour === 12) {
      hour = 0;
    }

    return hour * 60 + minute;
  };

  return convertToMinutes(a.time) - convertToMinutes(b.time);
});

return res.json(slots);
  } catch (error) {
    console.error("Generate Slots Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Update slot availability
router.patch("/:id/status", async (req, res) => {
  try {
    const slotId = Number(req.params.id);
    const { isAvailable } = req.body;

    if (!Number.isInteger(slotId) || slotId <= 0) {
      return res.status(400).json({
        message: "Valid slot ID is required",
      });
    }

    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({
        message: "isAvailable must be true or false",
      });
    }

    const slot = await prisma.availability.findUnique({
      where: {
        id: slotId,
      },
    });

    if (!slot) {
      return res.status(404).json({
        message: "Slot not found",
      });
    }

    const updatedSlot = await prisma.availability.update({
      where: {
        id: slotId,
      },
      data: {
        isAvailable,
      },
    });

    return res.json({
      message: "Slot availability updated successfully",
      slot: updatedSlot,
    });
  } catch (error) {
    console.error("Update Slot Availability Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Create slot
router.post("/", async (req, res) => {
  try {
    const { salonId, date, time, isAvailable } = req.body;

    if (!salonId || !date || !time) {
      return res.status(400).json({
        message: "Required slot details are missing",
      });
    }

    const slot = await prisma.availability.create({
      data: {
        salonId,
        date: new Date(date),
        time,
        isAvailable: isAvailable ?? true,
      },
    });

    return res.status(201).json({
      message: "Slot created successfully",
      slot,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;