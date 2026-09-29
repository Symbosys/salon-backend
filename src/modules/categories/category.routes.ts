import { Router } from "express";
import prisma from "../../prisma";

const router = Router();

// Get all active categories
router.get("/", async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    return res.json(categories);
  } catch (error) {
    console.error("Get Categories Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;