import { Router } from "express";
import prisma from "../../prisma";

const router = Router();

// Get services of a salon
router.get("/:salonId", async (req, res) => {
  try {
    const salonId = Number(req.params.salonId);

    if (!Number.isInteger(salonId) || salonId <= 0) {
      return res.status(400).json({
        message: "Valid salonId is required",
      });
    }

   const services = await prisma.service.findMany({
  where: {
    salonId: salonId,
    isDeleted: false,
  },
  orderBy: {
    id: "asc",
  },
});

    return res.json(services);
  } catch (error) {
    console.error("Get Services Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Create service
router.post("/", async (req, res) => {
  try {
    const {
      salonId,
      name,
      category,
      price,
      duration,
      icon,
    } = req.body;

    const parsedSalonId = Number(salonId);
    const parsedPrice = Number(price);
    const parsedDuration = Number(duration);

    if (
      !Number.isInteger(parsedSalonId) ||
      parsedSalonId <= 0 ||
      !name ||
      !category ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice <= 0 ||
      !Number.isFinite(parsedDuration) ||
      parsedDuration <= 0
    ) {
      return res.status(400).json({
        message: "Required service details are missing or invalid",
      });
    }

    const service = await prisma.service.create({
      data: {
        salonId: parsedSalonId,
        name: String(name),
        category: String(category),
        price: parsedPrice,
        duration: parsedDuration,
        icon: icon ? String(icon) : null,
      },
    });

    return res.status(201).json({
      message: "Service created successfully",
      service,
    });
  } catch (error) {
    console.error("Create Service Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Update service
router.put("/:id", async (req, res) => {
  try {
    const serviceId = Number(req.params.id);

    const {
      name,
      category,
      price,
      duration,
      icon,
      isActive,
    } = req.body;

    const parsedPrice = Number(price);
    const parsedDuration = Number(duration);

    if (
      !Number.isInteger(serviceId) ||
      serviceId <= 0 ||
      !name ||
      !category ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice <= 0 ||
      !Number.isFinite(parsedDuration) ||
      parsedDuration <= 0
    ) {
      return res.status(400).json({
        message: "Required service details are missing or invalid",
      });
    }

    const existingService = await prisma.service.findUnique({
      where: {
        id: serviceId,
      },
    });

    if (!existingService) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    const updatedService = await prisma.service.update({
      where: {
        id: serviceId,
      },
      data: {
        name: String(name),
        category: String(category),
        price: parsedPrice,
        duration: parsedDuration,
        icon: icon ? String(icon) : null,
        isActive:
          typeof isActive === "boolean"
            ? isActive
            : existingService.isActive,
      },
    });

    return res.json({
      message: "Service updated successfully",
      service: updatedService,
    });
  } catch (error) {
    console.error("Update Service Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Toggle service active/inactive
router.patch("/:id/status", async (req, res) => {
  try {
    const serviceId = Number(req.params.id);
    const { isActive } = req.body;

    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      return res.status(400).json({
        message: "Valid service ID is required",
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive must be true or false",
      });
    }

    const service = await prisma.service.findUnique({
      where: {
        id: serviceId,
      },
    });

    if (!service) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    const updatedService = await prisma.service.update({
      where: {
        id: serviceId,
      },
      data: {
        isActive,
      },
    });

    return res.json({
      message: "Service status updated successfully",
      service: updatedService,
    });
  } catch (error) {
    console.error("Toggle Service Status Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Soft Delete service
router.delete("/:id", async (req, res) => {
  try {
    const serviceId = Number(req.params.id);

    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      return res.status(400).json({
        message: "Valid service ID is required",
      });
    }

    const service = await prisma.service.findUnique({
      where: {
        id: serviceId,
      },
    });

    if (!service) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    const updatedService = await prisma.service.update({
      where: {
        id: serviceId,
      },
      data: {
        isDeleted: true,
        isActive: false,
      },
    });

    return res.json({
      message: "Service deleted successfully",
      service: updatedService,
    });
  } catch (error) {
    console.error("Soft Delete Service Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;