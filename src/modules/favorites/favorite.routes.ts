import { Router } from "express";
import prisma from "../../prisma";

const router = Router();

// ================= ADD FAVORITE =================
router.post("/", async (req, res) => {
  try {
    const { userId, salonId } = req.body;

    if (!userId || !salonId) {
      return res.status(400).json({
        message: "userId and salonId are required",
      });
    }

    const favorite = await prisma.favorite.upsert({
      where: {
        userId_salonId: {
          userId: Number(userId),
          salonId: Number(salonId),
        },
      },
      update: {},
      create: {
        userId: Number(userId),
        salonId: Number(salonId),
      },
    });

    return res.status(201).json({
      message: "Salon added to favorites",
      favorite,
    });
  } catch (error) {
    console.error("Add Favorite Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// ================= REMOVE FAVORITE =================
router.delete("/:userId/:salonId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const salonId = Number(req.params.salonId);

    await prisma.favorite.delete({
      where: {
        userId_salonId: {
          userId,
          salonId,
        },
      },
    });

    return res.json({
      message: "Salon removed from favorites",
    });
  } catch (error) {
    console.error("Remove Favorite Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// ================= GET FAVORITES =================
router.get("/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    const favorites = await prisma.favorite.findMany({
      where: {
        userId,
      },
      include: {
        salon: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(favorites);
  } catch (error) {
    console.error("Get Favorites Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;