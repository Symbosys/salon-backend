import { Router } from "express";
import prisma from "../../prisma";

const router = Router();

// Get staff of a salon
router.get("/:salonId", async (req, res) => {
  try {
    const salonId = Number(req.params.salonId);

    const staff = await prisma.staff.findMany({
  where: {
    salonId,
    isDeleted: false,
  },
});

    return res.json(staff);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Add staff
router.post("/", async (req, res) => {
  try {
    const { salonId, name, role, status } = req.body;

    if (!salonId || !name || !role) {
      return res.status(400).json({
        message: "Required staff details are missing",
      });
    }

    const staff = await prisma.staff.create({
      data: {
        salonId,
        name,
        role,
        status: status || "AVAILABLE",
      },
    });

    return res.status(201).json({
      message: "Staff added successfully",
      staff,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Update staff
router.put("/:id", async (req, res) => {
  try {
    const staffId = Number(req.params.id);
    const { name, role, status } = req.body;

    if (!Number.isInteger(staffId) || staffId <= 0) {
      return res.status(400).json({
        message: "Valid staff ID is required",
      });
    }

    if (!name || !role) {
      return res.status(400).json({
        message: "Name and role are required",
      });
    }

    const existingStaff = await prisma.staff.findUnique({
      where: {
        id: staffId,
      },
    });

    if (!existingStaff) {
      return res.status(404).json({
        message: "Staff not found",
      });
    }

    const updatedStaff = await prisma.staff.update({
      where: {
        id: staffId,
      },
      data: {
        name: String(name),
        role: String(role),
        status: status || existingStaff.status,
      },
    });

    return res.json({
      message: "Staff updated successfully",
      staff: updatedStaff,
    });
  } catch (error) {
    console.error("Update Staff Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Update staff availability
router.patch("/:id/status", async (req, res) => {
  try {
    const staffId = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(staffId) || staffId <= 0) {
      return res.status(400).json({
        message: "Valid staff ID is required",
      });
    }

    if (!["AVAILABLE", "UNAVAILABLE"].includes(status)) {
      return res.status(400).json({
        message: "Valid staff status is required",
      });
    }

    const staff = await prisma.staff.findUnique({
      where: {
        id: staffId,
      },
    });

    if (!staff) {
      return res.status(404).json({
        message: "Staff not found",
      });
    }

    const updatedStaff = await prisma.staff.update({
      where: {
        id: staffId,
      },
      data: {
        status,
      },
    });

    return res.json({
      message: "Staff availability updated successfully",
      staff: updatedStaff,
    });
  } catch (error) {
    console.error("Update Staff Availability Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Soft Delete staff
router.delete("/:id", async (req, res) => {
  try {
    const staffId = Number(req.params.id);

    if (!Number.isInteger(staffId) || staffId <= 0) {
      return res.status(400).json({
        message: "Valid staff ID is required",
      });
    }

    const staff = await prisma.staff.findUnique({
      where: {
        id: staffId,
      },
    });

    if (!staff) {
      return res.status(404).json({
        message: "Staff not found",
      });
    }

    const updatedStaff = await prisma.staff.update({
      where: {
        id: staffId,
      },
      data: {
        isDeleted: true,
        status: "UNAVAILABLE",
      },
    });

    return res.json({
      message: "Staff deleted successfully",
      staff: updatedStaff,
    });
  } catch (error) {
    console.error("Soft Delete Staff Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;