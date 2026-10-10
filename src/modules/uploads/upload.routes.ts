import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

const uploadDir = path.join(
  process.cwd(),
  "uploads",
  "kyc"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },

  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname);

    const fileName =
      `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 10)}${extension}`;

    cb(null, fileName);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error("Only JPG, PNG and PDF files are allowed")
      );
    }

    cb(null, true);
  },
});

router.post(
  "/kyc",
  upload.single("document"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Document is required",
        });
      }

      const documentUrl =
        `/uploads/kyc/${req.file.filename}`;

      return res.json({
        message: "Document uploaded successfully",
        url: documentUrl,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
      });
    } catch (error) {
      console.error("KYC Upload Error:", error);

      return res.status(500).json({
        message: "Document upload failed",
      });
    }
  }
);

export default router;