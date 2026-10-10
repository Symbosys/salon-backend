import { Router } from "express";
import prisma from "../../prisma";
import { sendFcmNotification } from "../../services/fcm.service";

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
      include: {
        salon: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // ==========================================================
    // NEW OFFER NOTIFICATION
    // ==========================================================

    if (offer.isActive) {
      const notificationTitle = "New Offer Available 🎉";

      const notificationMessage =
        `${offer.salon.name} has a new ${offer.discount}% OFF offer. Tap to check it out.`;

      const notificationType = "NEW_OFFER";

      // Get every active Customer device token
      const customerTokens = await prisma.deviceToken.findMany({
        where: {
          userId: {
            not: null,
          },
          isActive: true,
          user: {
            role: "CUSTOMER",
          },
        },
      });

      // Group devices by Customer
      const customerDevices = new Map<number, typeof customerTokens>();

      for (const device of customerTokens) {
        if (!device.userId) {
          continue;
        }

        const existingDevices =
          customerDevices.get(device.userId) || [];

        existingDevices.push(device);

        customerDevices.set(
          device.userId,
          existingDevices,
        );
      }

      // One In-App notification per Customer
      // FCM to every active device of that Customer
      for (const [customerId, devices] of customerDevices) {
        try {
          const notification =
            await prisma.notification.create({
              data: {
                userId: customerId,
                title: notificationTitle,
                message: notificationMessage,
              },
            });

          for (const device of devices) {
            try {
              await sendFcmNotification(
                device.token,
                notificationTitle,
                notificationMessage,
                {
                  type: notificationType,
                  recipientId: String(customerId),
                  notificationId: String(notification.id),
                  salonId: String(offer.salonId),
                  offerId: String(offer.id),
                  screen: "Offer",
                },
              );
            } catch (error) {
              console.error(
                `Customer NEW_OFFER FCM failed for token ${device.id}:`,
                error,
              );
            }
          }
        } catch (error) {
          console.error(
            `NEW_OFFER notification failed for customer ${customerId}:`,
            error,
          );
        }
      }
    }

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