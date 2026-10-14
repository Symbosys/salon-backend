import { Router } from "express";
import prisma from "../../../prisma";
import jwt from "jsonwebtoken";

const router = Router();

// Admin Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const admin = await prisma.admin.findUnique({
      where: {
        email: email.toLowerCase().trim(),
      },
    });

    if (!admin) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (admin.status !== "ACTIVE") {
      return res.status(403).json({
        message: "Admin account is inactive",
      });
    }

    if (admin.password !== password) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    
const secret = process.env.JWT_SECRET;

if (!secret) {
  return res.status(500).json({
    message: "JWT_SECRET is not configured",
  });
}

const token = jwt.sign(
  {
    adminId: admin.id,
    email: admin.email,
    role: "admin",
  },
  secret,
  { expiresIn: "8h" }
);

return res.json({
  message: "Admin login successful",
  token,
  admin: {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    status: admin.status,
  },
});

  } catch (error) {
    console.error("Admin Login Error:", error);

    return res.status(500).json({
      message: "Failed to login",
    });
  }
});

export default router;