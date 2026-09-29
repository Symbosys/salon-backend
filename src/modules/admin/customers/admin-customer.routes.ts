import { Router } from "express";
import prisma from "../../../prisma";

const router = Router();

// Get all customers
router.get("/", async (_req, res) => {
  try {
    const customers = await prisma.user.findMany({
      where: {
        role: "CUSTOMER",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(customers);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Get customer by ID
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const customer = await prisma.user.findFirst({
      where: {
        id,
        role: "CUSTOMER",
      },
      include: {
        bookings: true,
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
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Update customer
router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

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
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// Delete customer
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

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
    console.error(error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
});

export default router;