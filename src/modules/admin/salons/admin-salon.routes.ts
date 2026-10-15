import { Router } from "express";
import prisma from "../../../prisma";
import { sendFcmNotification } from "../../../services/fcm.service";
import { verifyAdminToken } from "../../../admin-auth.middleware";
const router = Router();
router.use(verifyAdminToken);
import { v2 as cloudinary } from "cloudinary";
router.get("/:id/kyc/:documentType", async (req, res) => {
  try {
    const salonId = Number(req.params.id);
    const documentType = req.params.documentType;
    if (
      !Number.isInteger(salonId) ||
      !["aadhaar", "pan"].includes(documentType)
    ) {
      return res.status(400).json({
        message: "Invalid salon or document type",
      });
    }
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: {
        aadhaarDocument: true,
        panDocument: true,
      },
    });
    if (!salon) {
      return res.status(404).json({
        message: "Salon not found",
      });
    }
    const savedUrl =
      documentType === "aadhaar" ? salon.aadhaarDocument : salon.panDocument;
    if (!savedUrl) {
      return res.status(404).json({
        message: "Document not found",
      });
    }
    const parsedUrl = new URL(savedUrl);
    const parts = parsedUrl.pathname.split("/").filter(Boolean);
    const imageIndex = parts.findIndex(
      (part) => part === "authenticated" || part === "upload",
    );
    if (imageIndex === -1) {
      return res.status(400).json({
        message: "Unsupported Cloudinary URL",
      });
    }
    const assetParts = parts.slice(imageIndex + 1);
    if (assetParts[0]?.startsWith("s--")) {
      assetParts.shift();
    }
    if (/^v\d+$/.test(assetParts[0] || "")) {
      assetParts.shift();
    }
    const filePath = assetParts.join("/");
    const publicId = filePath.replace(/\.[^.]+$/, "");
    const extension = filePath.split(".").pop()?.toLowerCase();
    if (
      !publicId ||
      !["jpg", "jpeg", "png", "webp"].includes(extension || "")
    ) {
      return res.status(400).json({
        message: "Unsupported document URL",
      });
    }
    const signedUrl = cloudinary.url(publicId, {
      type: "authenticated",
      sign_url: true,
      secure: true,
      resource_type: "image",
      format: extension,
      expires_at: Math.floor(Date.now() / 1000) + 300,
    });
    return res.json({ url: signedUrl });
  } catch (error) {
    console.error("Admin KYC image error:", error);
    return res.status(500).json({
      message: "Unable to access document",
    });
  }
});
async function notifyPartnerApplicationStatus(
  partnerId: number,
  salonId: number,
  salonName: string,
  status: "APPLICATION_APPROVED" | "APPLICATION_REJECTED",
  rejectionReason?: string,
) {
  const isApproved = status === "APPLICATION_APPROVED";
  const title = isApproved ? "Application Approved" : "Application Rejected";
  const message = isApproved
    ? `Congratulations! Your salon ${salonName} has been approved.`
    : `Your salon ${salonName} application was rejected. Reason: ${rejectionReason}`;
  const notification = await prisma.notification.create({
    data: {
      partnerId,
      title,
      message,
    },
  });
  const devices = await prisma.deviceToken.findMany({
    where: {
      partnerId,
      isActive: true,
    },
  });
  for (const device of devices) {
    try {
      await sendFcmNotification(device.token, title, message, {
        type: status,
        recipientId: String(partnerId),
        partnerId: String(partnerId),
        salonId: String(salonId),
        notificationId: String(notification.id),
        screen: isApproved ? "Home" : "Correction",
      });
    } catch (error) {
      console.error(
        `Partner application notification failed for device ${device.id}:`,
        error,
      );
    }
  }
}
router.get("/", async (_req, res) => {
  try {
    const salons = await prisma.salon.findMany({
      include: {
        owner: true,
        partner: true,
        reviews: true,
        bookings: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    const formattedSalons = salons.map((salon) => {
      const totalReviews = salon.reviews?.length || 0;
      const averageRating =
        totalReviews > 0
          ? salon.reviews.reduce(
              (sum, review) => sum + Number(review.rating || 0),
              0,
            ) / totalReviews
          : 0;
      const kycVerified = !!salon.aadhaarNumber && !!salon.panNumber;
      return {
        ...salon,
        partner: salon.partner
          ? {
              id: salon.partner.id,
              name: salon.partner.name,
              mobile: salon.partner.mobile,
              email: salon.partner.email,
            }
          : null,
        rating: Number(averageRating.toFixed(1)),
        bookings: salon.bookings?.length || 0,
        kyc: kycVerified ? "Verified" : "Pending",
      };
    });
    return res.json(formattedSalons);
  } catch (error) {
    console.error("Get All Salons Error:", error);
    return res.status(500).json({
      message: "Failed to fetch salons",
    });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({
        message: "Invalid salon ID",
      });
    }
    const salon = await prisma.salon.findUnique({
      where: {
        id,
      },
      include: {
        owner: true,
        partner: true,
        services: true,
        staff: true,
        bookings: true,
        offers: true,
        reviews: true,
        availabilities: true,
      },
    });
    if (!salon) {
      return res.status(404).json({
        message: "Salon not found",
      });
    }
    return res.json(salon);
  } catch (error) {
    console.error("Get Salon Error:", error);
    return res.status(500).json({
      message: "Failed to fetch salon",
    });
  }
});
router.patch("/:id/approve", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({
        message: "Invalid salon ID",
      });
    }
    const salon = await prisma.salon.update({
      where: {
        id,
      },
      data: {
        status: "APPROVED",
        rejectionReason: null,
      },
    });
    if (salon.partnerId) {
      try {
        await notifyPartnerApplicationStatus(
          salon.partnerId,
          salon.id,
          salon.name,
          "APPLICATION_APPROVED",
        );
      } catch (error) {
        console.error("Partner approval notification error:", error);
      }
    }
    return res.json({
      message: "Salon approved successfully",
      salon,
    });
  } catch (error) {
    console.error("Approve Salon Error:", error);
    return res.status(500).json({
      message: "Failed to approve salon",
    });
  }
});
router.patch("/:id/reject", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { rejectionReason } = req.body;
    if (!Number.isInteger(id)) {
      return res.status(400).json({
        message: "Invalid salon ID",
      });
    }
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
    if (salon.partnerId) {
      try {
        await notifyPartnerApplicationStatus(
          salon.partnerId,
          salon.id,
          salon.name,
          "APPLICATION_REJECTED",
          String(rejectionReason).trim(),
        );
      } catch (error) {
        console.error("Partner rejection notification error:", error);
      }
    }
    return res.json({
      message: "Salon rejected successfully",
      salon,
    });
  } catch (error) {
    console.error("Reject Salon Error:", error);
    return res.status(500).json({
      message: "Failed to reject salon",
    });
  }
});
router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({
        message: "Invalid salon ID",
      });
    }
    const { name, category, address, city, state, pincode, isLive } = req.body;
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
    console.error("Update Salon Error:", error);
    return res.status(500).json({
      message: "Failed to update salon",
    });
  }
});
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({
        message: "Invalid salon ID",
      });
    }
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
    console.error("Delete Salon Error:", error);
    return res.status(500).json({
      message: "Failed to delete salon",
    });
  }
});
export default router;
