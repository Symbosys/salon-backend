
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface AdminTokenPayload {
  adminId: string;
  email: string;
  role: string;
}

export interface AdminAuthenticatedRequest extends Request {
  admin?: AdminTokenPayload;
}

export function verifyAdminToken(
  req: AdminAuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Admin authentication token is required",
      });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({
        message: "JWT_SECRET is not configured",
      });
    }

    const decoded = jwt.verify(token, secret);

    if (
      typeof decoded === "string" ||
      decoded.role !== "admin" ||
      !decoded.adminId ||
      !decoded.email
    ) {
      return res.status(403).json({
        message: "Invalid admin token",
      });
    }

    req.admin = {
      adminId: String(decoded.adminId),
      email: String(decoded.email),
      role: "admin",
    };

    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired admin token",
    });
  }
}
