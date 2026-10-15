import { Router } from "express";
import prisma from "../../../prisma";
import { sendFcmNotification } from "../../../services/fcm.service";
const router = Router();
router.get("/", async (_req, res) => {
  try {
    const customers = await prisma.user.findMany({
      where: {
        role: "CUSTOMER",
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        bookings: {
          select: {
            id: true,
            bookingFee: true,
          },
        },
      },
    });
    const formattedCustomers = customers.map((customer) => {
      const totalSpent = customer.bookings.reduce(
        (total, booking) => total + Number(booking.bookingFee || 0),
        0,
      );
      return {
        id: customer.id,
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email,
        role: customer.role,
        status: customer.status,
        createdAt: customer.createdAt,
        bookings: customer.bookings.length,
        spent: totalSpent,
      };
    });
    return res.json(formattedCustomers);
  } catch (error) {
    console.error("Get Customers Error:", error);
    return res.status(500).json({
      message: "Failed to fetch customers",
    });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({
        message: "Invalid customer ID",
      });
    }
    const customer = await prisma.user.findFirst({
      where: {
        id,
        role: "CUSTOMER",
      },
      include: {
        bookings: {
          include: {
            salon: true,
            service: true,
            payment: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        reviews: true,
        notifications: true,
      },
    });
    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }
    return res.json(customer);
  } catch (error) {
    console.error("Get Customer Error:", error);
    return res.status(500).json({
      message: "Failed to fetch customer",
    });
  }
});
router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({
        message: "Invalid customer ID",
      });
    }
    const { name, mobile, email } = req.body;
    const customer = await prisma.user.update({
      where: {
        id,
      },
      data: {
        name,
        mobile,
        email,
      },
    });
    return res.json(customer);
  } catch (error) {
    console.error("Update Customer Error:", error);
    return res.status(500).json({
      message: "Failed to update customer",
    });
  }
});
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({
        message: "Invalid customer ID",
      });
    }
    const customer = await prisma.user.delete({
      where: {
        id,
      },
    });
    return res.json({
      message: "Customer deleted successfully",
      customer,
    });
  } catch (error) {
    console.error("Delete Customer Error:", error);
    return res.status(500).json({
      message: "Failed to delete customer",
    });
  }
});
router.get("/:id/status", async (req, res) => {
  try {
    const customerId = Number(req.params.id);
    if (!Number.isInteger(customerId)) {
      return res.status(400).json({
        message: "Invalid customer ID",
      });
    }
    const customer = await prisma.user.findFirst({
      where: {
        id: customerId,
        role: "CUSTOMER",
      },
      select: {
        id: true,
        status: true,
      },
    });
    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }
    return res.json({
      id: customer.id,
      status: customer.status,
    });
  } catch (error) {
    console.error("Get Customer Status Error:", error);
    return res.status(500).json({
      message: "Failed to fetch customer status",
    });
  }
});
router.patch("/:id/status", async (req, res) => {
  try {
    const customerId = Number(req.params.id);
    const { status } = req.body;
    if (!Number.isInteger(customerId)) {
      return res.status(400).json({
        message: "Invalid customer ID",
      });
    }
    if (!["ACTIVE", "SUSPENDED"].includes(status)) {
      return res.status(400).json({
        message: "Status must be ACTIVE or SUSPENDED",
      });
    }
    const customer = await prisma.user.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }
    const updatedCustomer = await prisma.user.update({
      where: { id: customerId },
      data: {
        status,
      },
    });
    const isSuspended = status === "SUSPENDED";
    const title = isSuspended ? "Account Suspended" : "Account Reactivated";
    const message = isSuspended
      ? "Your account has been suspended. Please contact support for more information."
      : "Your account has been reactivated. You can now use SalonApp again.";
    const notificationType = isSuspended
      ? "CUSTOMER_ACCOUNT_SUSPENDED"
      : "CUSTOMER_ACCOUNT_REACTIVATED";
    const screen = isSuspended ? "AccountSuspended" : "Home";
    const notification = await prisma.notification.create({
      data: {
        userId: customerId,
        title,
        message,
      },
    });
    const customerTokens = await prisma.deviceToken.findMany({
      where: {
        userId: customerId,
        isActive: true,
      },
    });
    for (const device of customerTokens) {
      try {
        await sendFcmNotification(device.token, title, message, {
          type: notificationType,
          recipientId: String(customerId),
          notificationId: String(notification.id),
          screen,
        });
      } catch (error) {
        console.error(`Customer FCM failed for token ${device.id}:`, error);
      }
    }
    return res.json({
      message: isSuspended
        ? "Customer suspended successfully"
        : "Customer activated successfully",
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error("Update Customer Status Error:", error);
    return res.status(500).json({
      message: "Failed to update customer status",
    });
  }
});
export default router;
