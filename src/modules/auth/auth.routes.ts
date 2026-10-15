import { Router } from "express";
import prisma from "../../prisma";
const router = Router();
router.post("/send-otp", (req, res) => {
  const { mobile } = req.body;
  if (!mobile) {
    return res.status(400).json({
      message: "Mobile number is required",
    });
  }
  res.json({
    message: "OTP sent successfully",
    mobile,
    otp: "1234",
  });
});
router.post("/verify-otp", async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) {
      return res.status(400).json({
        message: "Mobile number and OTP are required",
      });
    }
    if (otp !== "1234") {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }
    let user = await prisma.user.findUnique({
      where: {
        mobile,
      },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          mobile,
          name: "Customer",
          role: "CUSTOMER",
        },
      });
    }
    return res.json({
      message: "OTP verified successfully",
      user,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});
router.get("/status/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({
        message: "Invalid customer ID",
      });
    }
    const user = await prisma.user.findFirst({
      where: {
        id,
        role: "CUSTOMER",
      },
      select: {
        id: true,
        status: true,
      },
    });
    if (!user) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }
    return res.json({
      id: user.id,
      status: user.status,
    });
  } catch (error) {
    console.error("Get Account Status Error:", error);
    return res.status(500).json({
      message: "Failed to fetch account status",
    });
  }
});
router.post("/login", async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res.status(400).json({
        message: "Mobile number is required",
      });
    }
    const user = await prisma.user.findUnique({
      where: {
        mobile,
      },
    });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    return res.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});
export default router;
