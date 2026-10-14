
import { Router } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Keep files in memory temporarily; do not save them on the server disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error("Only JPG and PNG images are allowed")
      );
    }

    cb(null, true);
  },
});

router.post(
  "/kyc",
  upload.single("document"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Document image is required",
        });
      }

      if (
        !process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET
      ) {
        return res.status(500).json({
          message: "Cloudinary is not configured",
        });
      }

      const imageData = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

      const result = await cloudinary.uploader.upload(
        imageData,
        {
          folder: "salonapp/kyc",
          resource_type: "image",
          type: "authenticated",
        }
      );

      return res.json({
        message: "Document uploaded successfully",
        url: result.secure_url,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        publicId: result.public_id,
      });
    } catch (error) {
      console.error("KYC Cloudinary Upload Error:", error);

      return res.status(500).json({
        message: "Document upload failed",
      });
    }
  }
);

export default router;
