import { Router } from "express";
import prisma from "../../prisma";

const router = Router();

// Create Offer
router.post("/", async (req, res) => {
  try {
    const {
      salonId,
      title,
      description,
      discount,
      isActive,
    } = req.body;

    if (!salonId || !title || discount === undefined) {
      return res.status(400).json({
        message: "Required offer details are missing",
      });
    }

    const offer = await prisma.offer.create({
      data: {
        salonId: Number(salonId),
        title,
        description,
        discount: Number(discount),
        isActive: isActive ?? true,
      },
    });

    return res.status(201).json({
      message: "Offer created successfully",
      offer,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Get All Active Offers
router.get("/", async (req, res) => {
  try {
    const offers = await prisma.offer.findMany({
     where: {
  isActive: true,
  deletedAt: null,
},
      include: {
        salon: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(offers);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Get Offers by Salon
router.get("/:salonId", async (req, res) => {
  try {
    const salonId = Number(req.params.salonId);

    const offers = await prisma.offer.findMany({
      where: {
  salonId,
  deletedAt: null,
},
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(offers);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Update Offer
router.patch("/:id", async (req, res) => {
  try {
    const offerId = Number(req.params.id);

    const {
      title,
      description,
      discount,
      isActive,
    } = req.body;

    if (!Number.isInteger(offerId)) {
      return res.status(400).json({
        message: "Invalid offer ID",
      });
    }

    const updateData: {
      title?: string;
      description?: string;
      discount?: number;
      isActive?: boolean;
    } = {};

    // Edit title
    if (title !== undefined) {
      if (!String(title).trim()) {
        return res.status(400).json({
          message: "Offer title is required",
        });
      }

      updateData.title = String(title).trim();
    }

    // Edit description
    if (description !== undefined) {
      updateData.description = String(description).trim();
    }

    // Edit discount
    if (discount !== undefined) {
      const discountValue = Number(discount);

      if (
        !Number.isFinite(discountValue) ||
        discountValue <= 0 ||
        discountValue > 100
      ) {
        return res.status(400).json({
          message: "Discount must be between 1% and 100%",
        });
      }

      updateData.discount = discountValue;
    }

    // Enable / Disable
    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          message: "isActive must be true or false",
        });
      }

      updateData.isActive = isActive;
    }

    const offer = await prisma.offer.update({
      where: {
        id: offerId,
      },
      data: updateData,
    });

    return res.json({
      message: "Offer updated successfully",
      offer,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Soft Delete Offer
router.delete("/:id", async (req, res) => {
  try {
    const offerId = Number(req.params.id);

    if (!Number.isInteger(offerId)) {
      return res.status(400).json({
        message: "Invalid offer ID",
      });
    }

    const offer = await prisma.offer.update({
      where: {
        id: offerId,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return res.json({
      message: "Offer deleted successfully",
      offer,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;