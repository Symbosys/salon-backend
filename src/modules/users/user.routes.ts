import { Router } from "express";
import prisma from "../../prisma";

const router = Router();

// Get user profile
router.get("/:id", async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!userId) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        mobile: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json(user);
  } catch (error) {
    console.error("Get User Error:", error);

    return res.status(500).json({
      message: "Failed to fetch user profile",
    });
  }
});

// Update user profile
router.patch("/:id", async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { name, email } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Name is required",
      });
    }

    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        name: name.trim(),
        email: email?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        mobile: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return res.json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("Update User Error:", error);

    return res.status(500).json({
      message: "Failed to update user profile",
    });
  }
});

// Update user location
router.patch("/:id/location", async (req, res) => {
  try {
    const userId = Number(req.params.id);

    const {
      address,
      city,
      state,
      pincode,
      latitude,
      longitude,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    if (
      latitude === undefined ||
      latitude === null ||
      longitude === undefined ||
      longitude === null
    ) {
      return res.status(400).json({
        message: "Latitude and longitude are required",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        address: String(address || ""),
        city: String(city || ""),
        state: String(state || ""),
        pincode: String(pincode || ""),
        latitude: Number(latitude),
        longitude: Number(longitude),
      },
    });

    return res.json({
      message: "Customer location updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Customer Location Update Error:", error);

    return res.status(500).json({
      message: "Failed to update customer location",
    });
  }
});

export default router;