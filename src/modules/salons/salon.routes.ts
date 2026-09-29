import { Router } from "express";
import prisma from "../../prisma";

const router = Router();

const partnerOtps = new Map<string, string>();

router.post("/partner/send-otp", async (req, res) => {
  try {
    const mobile = String(req.body.mobile || "").trim();

    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({
        message: "Enter a valid 10-digit mobile number",
      });
    }

    const otp = "1234";

    partnerOtps.set(mobile, otp);

    console.log(`Partner OTP for ${mobile}: ${otp}`);

    return res.json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Partner Send OTP Error:", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

router.post("/partner/verify-otp", async (req, res) => {
  try {
    const mobile = String(req.body.mobile || "").trim();
    const otp = String(req.body.otp || "").trim();

    const savedOtp = partnerOtps.get(mobile);

    if (!savedOtp || savedOtp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    partnerOtps.delete(mobile);

    return res.json({
      message: "Mobile number verified successfully",
      verified: true,
    });
  } catch (error) {
    console.error("Partner Verify OTP Error:", error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// ======================================================
// REVERSE GEOCODING - OLA MAPS
// ======================================================

router.get("/reverse-geocode", async (req, res) => {
  try {
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({
        message: "Valid latitude and longitude are required",
      });
    }

    const apiKey = process.env.OLA_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        message: "Ola Maps API key is not configured",
      });
    }

    const olaUrl =
  `https://api.olamaps.io/places/v1/reverse-geocode` +
  `?latlng=${encodeURIComponent(`${latitude},${longitude}`)}` +
  `&api_key=${encodeURIComponent(apiKey)}`;

console.log("========== OLA REQUEST ==========");
console.log("Latitude:", latitude);
console.log("Longitude:", longitude);
console.log("Ola URL:", olaUrl);
console.log("=================================");

    const response = await fetch(olaUrl, {
      method: "GET",
      headers: {
        "X-Request-Id": `reverse-${Date.now()}`,
      },
    });

    const data = await response.json();

    console.log("Ola Reverse Geocode:", response.status, data);

    if (!response.ok) {
      return res.status(response.status).json({
        message: "Ola Maps reverse geocoding failed",
        details: data,
      });
    }

    return res.json(data);
  } catch (error) {
    console.error("Reverse Geocode Error:", error);

    return res.status(500).json({
      message: "Unable to reverse geocode location",
    });
  }
});

// ======================================================
// GET ALL SALONS
// ======================================================

router.get("/", async (_req, res) => {
  try {
    const salons = await prisma.salon.findMany({
      include: {
        services: {
          where: {
            isActive: true,
          },
        },
        staff: true,
        reviews: true,
      },
    });

    const formattedSalons = salons.map((salon) => {
      const ratings = salon.reviews.map((review) => review.rating);

      const averageRating =
        ratings.length > 0
          ? ratings.reduce((sum, rating) => sum + rating, 0) /
            ratings.length
          : 0;

      return {
        id: salon.id,
        name: salon.name,
        category: salon.category,
        address: salon.address,
        city: salon.city,
        state: salon.state,
        pincode: salon.pincode,
        latitude: salon.latitude,
        longitude: salon.longitude,
        status: salon.status,
        isLive: salon.isLive,
        image: salon.image,
        services: salon.services,
        staff: salon.staff,
        rating: Number(averageRating.toFixed(1)),
        reviewCount: salon.reviews.length,
      };
    });

    return res.json(formattedSalons);
  } catch (error) {
    console.error("Get Salons Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// ======================================================
// PARTNER REGISTRATION
// ======================================================

router.get("/partner/:mobile", async (req, res) => {
  try {
    const mobile = String(req.params.mobile).trim();

    if (!mobile) {
      return res.status(400).json({
        message: "Mobile number is required",
      });
    }

    const partner = await prisma.partner.findUnique({
      where: {
        mobile,
      },
      include: {
        salons: true,
      },
    });

    if (!partner) {
      return res.status(404).json({
        registered: false,
        message: "Partner not registered",
      });
    }

    const salon = partner.salons[0] ?? null;

    return res.json({
      registered: true,
      partner,
      salon,
    });
  } catch (error) {
    console.error("Check Partner Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Partner Live / Offline
router.patch("/partner/:mobile/live", async (req, res) => {
  try {
    const mobile = String(req.params.mobile).trim();
    const { isLive } = req.body;

    const partner = await prisma.partner.findUnique({
      where: {
        mobile,
      },
    });

    if (!partner) {
      return res.status(404).json({
        message: "Partner not found",
      });
    }

    const salon = await prisma.salon.findFirst({
      where: {
        partnerId: partner.id,
      },
    });

    if (!salon) {
      return res.status(404).json({
        message: "Salon not found",
      });
    }

    const updatedSalon = await prisma.salon.update({
      where: {
        id: salon.id,
      },
      data: {
        isLive: Boolean(isLive),
      },
    });

    return res.json({
      message: "Salon live status updated successfully",
      salon: updatedSalon,
    });
  } catch (error) {
    console.error("Partner Live Status Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// ======================================================
// UPDATE PARTNER SALON LOCATION
// ======================================================

router.patch("/partner/:mobile/location", async (req, res) => {
  try {
    const mobile = String(req.params.mobile).trim();

    const {
      address,
      city,
      state,
      pincode,
      latitude,
      longitude,
    } = req.body;

    if (!mobile) {
      return res.status(400).json({
        message: "Partner mobile is required",
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

    const partner = await prisma.partner.findUnique({
      where: {
        mobile,
      },
    });

    if (!partner) {
      return res.status(404).json({
        message: "Partner not found",
      });
    }

    const salon = await prisma.salon.findFirst({
      where: {
        partnerId: partner.id,
      },
    });

    if (!salon) {
      return res.status(404).json({
        message: "Salon not found",
      });
    }

    const updatedSalon = await prisma.salon.update({
      where: {
        id: salon.id,
      },
      data: {
        address: String(address || salon.address || ""),
        city: String(city || salon.city || ""),
        state: String(state || salon.state || ""),
        pincode: String(pincode || salon.pincode || ""),
        latitude: Number(latitude),
        longitude: Number(longitude),
      },
    });

    return res.json({
      message: "Salon location updated successfully",
      salon: updatedSalon,
    });
  } catch (error) {
    console.error("Partner Location Update Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// ======================================================
// UPDATE CUSTOMER LOCATION
// ======================================================

router.patch("/customer/:customerId/location", async (req, res) => {
  try {
    const customerId = Number(req.params.customerId);

    const {
      address,
      city,
      state,
      pincode,
      latitude,
      longitude,
    } = req.body;

    if (!Number.isInteger(customerId)) {
      return res.status(400).json({
        message: "Invalid customer ID",
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

    const customer = await prisma.user.findUnique({
      where: {
        id: customerId,
      },
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    const updatedCustomer = await prisma.user.update({
      where: {
        id: customerId,
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
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error("Customer Location Update Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// ======================================================
// UPDATE PARTNER SALON PROFILE
// ======================================================

router.put("/partner/:mobile/profile", async (req, res) => {
  try {
    const mobile = String(req.params.mobile).trim();

    const {
      name,
      ownerName,
      email,
      address,
      city,
      state,
      pincode,
    } = req.body;

    if (!mobile) {
      return res.status(400).json({
        message: "Partner mobile is required",
      });
    }

    if (!name || !ownerName || !email || !address) {
      return res.status(400).json({
        message: "Required profile details are missing",
      });
    }

    const partner = await prisma.partner.findUnique({
      where: {
        mobile,
      },
    });

    if (!partner) {
      return res.status(404).json({
        message: "Partner not found",
      });
    }

    const salon = await prisma.salon.findFirst({
      where: {
        partnerId: partner.id,
      },
    });

    if (!salon) {
      return res.status(404).json({
        message: "Salon not found",
      });
    }

    const updatedPartner = await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        name: String(ownerName),
        email: String(email),
      },
    });

    const updatedSalon = await prisma.salon.update({
      where: {
        id: salon.id,
      },
      data: {
        name: String(name),
        ownerName: String(ownerName),
        address: String(address),
        city: city ? String(city) : salon.city,
        state: state ? String(state) : salon.state,
        pincode: pincode ? String(pincode) : salon.pincode,
      },
    });

    return res.json({
      message: "Profile updated successfully",
      partner: updatedPartner,
      salon: updatedSalon,
    });
  } catch (error) {
    console.error("Update Partner Profile Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      mobile,
      name,
      email,
      category,
      address,
      city,
      state,
      pincode,
      latitude,
      longitude,
      image,
      ownerName,

      // KYC
      aadhaarNumber,
      aadhaarDocument,
      panNumber,
      panDocument,
    } = req.body;

    // --------------------------------------------------
    // Validate required fields
    // --------------------------------------------------

    if (
      !mobile ||
      !name ||
      !category ||
      !address ||
      !city ||
      !state ||
      !pincode ||
      !aadhaarNumber ||
      !panNumber
    ) {
      return res.status(400).json({
        message: "Required registration and KYC details are missing",
      });
    }

    const partnerMobile = String(mobile).trim();

    // --------------------------------------------------
    // Check Partner already exists
    // --------------------------------------------------

    let partner = await prisma.partner.findUnique({
      where: {
        mobile: partnerMobile,
      },
    });

    // --------------------------------------------------
    // Create Partner if new
    // --------------------------------------------------

if (!partner) {
  partner = await prisma.partner.create({
    data: {
      name: String(ownerName),
      mobile: partnerMobile,
      email: email ? String(email) : null,
    },
  });
}

    // --------------------------------------------------
    // Check if Partner already has a Salon
    // --------------------------------------------------

    const existingSalon = await prisma.salon.findFirst({
      where: {
        partnerId: partner.id,
      },
    });

    if (existingSalon) {
      return res.status(409).json({
        message: "Partner is already registered",
        partner,
        salon: existingSalon,
      });
    }

    // --------------------------------------------------
    // Create Salon
    // --------------------------------------------------

    const salon = await prisma.salon.create({
      data: {
        // Partner is the owner of this salon
        partnerId: partner.id,

        // Existing ownerId is kept null for Partner registration
        ownerId: null,
        ownerName: String(ownerName),

        name: String(name),
        category: String(category),
        address: String(address),
        city: String(city),
        state: String(state),
        pincode: String(pincode),

        latitude:
          latitude !== undefined &&
          latitude !== null &&
          latitude !== ""
            ? Number(latitude)
            : null,

        longitude:
          longitude !== undefined &&
          longitude !== null &&
          longitude !== ""
            ? Number(longitude)
            : null,

        image: image ? String(image) : null,

        // KYC
        aadhaarNumber: String(aadhaarNumber),

        aadhaarDocument: aadhaarDocument
          ? String(aadhaarDocument)
          : null,

        panNumber: String(panNumber),

        panDocument: panDocument
          ? String(panDocument)
          : null,

        // New registration always goes for verification
        status: "PENDING",
        isLive: true,
      },
    });

    return res.status(201).json({
      message: "Registration submitted successfully",
      partner,
      salon,
    });
  } catch (error) {
    console.error("Partner Registration Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

router.put("/partner/:mobile/resubmit", async (req, res) => {
  try {
    const mobile = String(req.params.mobile).trim();

    const {
      name,
      ownerName,
      email,
      category,
      address,
      city,
      state,
      pincode,
      latitude,
      longitude,
      image,
      aadhaarNumber,
      aadhaarDocument,
      panNumber,
      panDocument,
    } = req.body;

    if (
      !mobile ||
      !name ||
      !ownerName ||
      !category ||
      !address ||
      !city ||
      !state ||
      !pincode ||
      !aadhaarNumber ||
      !panNumber
    ) {
      return res.status(400).json({
        message: "Required registration and KYC details are missing",
      });
    }

    const partner = await prisma.partner.findUnique({
      where: { mobile },
    });

    if (!partner) {
      return res.status(404).json({
        message: "Partner not found",
      });
    }

    const salon = await prisma.salon.findFirst({
      where: {
        partnerId: partner.id,
      },
    });

    if (!salon) {
      return res.status(404).json({
        message: "Salon registration not found",
      });
    }

    if (salon.status !== "REJECTED") {
      return res.status(400).json({
        message: "Only rejected applications can be resubmitted",
      });
    }

    const updatedSalon = await prisma.salon.update({
      where: {
        id: salon.id,
      },
      data: {
        ownerName: String(ownerName),
        name: String(name),
        category: String(category),
        address: String(address),
        city: String(city),
        state: String(state),
        pincode: String(pincode),

        latitude:
          latitude !== undefined && latitude !== null && latitude !== ""
            ? Number(latitude)
            : null,

        longitude:
          longitude !== undefined && longitude !== null && longitude !== ""
            ? Number(longitude)
            : null,

        image: image ? String(image) : null,

        aadhaarNumber: String(aadhaarNumber),
        aadhaarDocument: aadhaarDocument
          ? String(aadhaarDocument)
          : null,

        panNumber: String(panNumber),
        panDocument: panDocument
          ? String(panDocument)
          : null,

        status: "PENDING",
        isLive: true,
      },
    });

    return res.json({
      message: "Application resubmitted successfully",
      salon: updatedSalon,
    });
  } catch (error) {
    console.error("Partner Resubmit Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;