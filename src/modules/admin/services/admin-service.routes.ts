import { Router } from "express";
import prisma from "../../../prisma";

const router = Router();

// Get all services
router.get("/", async (_req, res) => {
  try {
    const services = await prisma.service.findMany({
      include: {
        salon: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(services);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Get service by ID
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const service = await prisma.service.findUnique({
      where: {
        id,
      },
      include: {
        salon: true,
      },
    });

    if (!service) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    return res.json(service);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Update service
router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const { name, category, price, duration, isActive } = req.body;

    const service = await prisma.service.update({
      where: {
        id,
      },
      data: {
        name,
        category,
        price,
        duration,
        isActive,
      },
    });

    return res.json(service);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Delete service
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const service = await prisma.service.delete({
      where: {
        id,
      },
    });

    return res.json({
      message: "Service deleted successfully",
      service,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;