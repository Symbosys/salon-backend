import { Router } from "express";
import prisma from "../../../prisma";

const router = Router();

// Get all salons
router.get("/", async (_req, res) => {
  try {
    const salons = await prisma.salon.findMany({
      include: {
        owner: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(salons);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Approve salon
router.patch("/:id/approve", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const salon = await prisma.salon.update({
      where: {
        id,
      },
      data: {
        status: "APPROVED",
      },
    });

    return res.json({
      message: "Salon approved successfully",
      salon,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Reject salon
router.patch("/:id/reject", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { rejectionReason } = req.body;

    if (!rejectionReason || !String(rejectionReason).trim()) {
      return res.status(400).json({
        message: "Rejection reason is required",
      });
    }

    const salon = await prisma.salon.update({
      where: {
        id,
      },
      data: {
        status: "REJECTED",
        rejectionReason: String(rejectionReason).trim(),
      },
    });

    return res.json({
      message: "Salon rejected successfully",
      salon,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Update salon
router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const {
      name,
      category,
      address,
      city,
      state,
      pincode,
      isLive,
    } = req.body;

    const salon = await prisma.salon.update({
      where: {
        id,
      },
      data: {
        name,
        category,
        address,
        city,
        state,
        pincode,
        isLive,
      },
    });

    return res.json(salon);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Delete salon
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const salon = await prisma.salon.delete({
      where: {
        id,
      },
    });

    return res.json({
      message: "Salon deleted successfully",
      salon,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;