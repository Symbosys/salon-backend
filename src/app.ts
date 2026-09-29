import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./modules/auth/auth.routes";
import salonRoutes from "./modules/salons/salon.routes";
import serviceRoutes from "./modules/services/service.routes";
import staffRoutes from "./modules/staff/staff.routes";
import availabilityRoutes from "./modules/availability/availability.routes";
import bookingRoutes from "./modules/bookings/booking.routes";
import paymentRoutes from "./modules/payments/payment.routes";
import offerRoutes from "./modules/offers/offer.routes";
import reviewRoutes from "./modules/reviews/review.routes";
import settlementRoutes from "./modules/settlements/settlement.routes";
import notificationRoutes from "./modules/notifications/notification.routes";
import adminSalonRoutes from "./modules/admin/salons/admin-salon.routes";
import adminBookingRoutes from "./modules/admin/bookings/admin-booking.routes";
import adminCustomerRoutes from "./modules/admin/customers/admin-customer.routes";
import adminServiceRoutes from "./modules/admin/services/admin-service.routes";
import adminPaymentRoutes from "./modules/admin/payments/admin-payment.routes";
import adminSettlementRoutes from "./modules/admin/settlements/admin-settlement.routes";
import adminReviewRoutes from "./modules/admin/reviews/admin-review.routes";
import adminOfferRoutes from "./modules/admin/offers/admin-offer.routes";
import adminNotificationRoutes from "./modules/admin/notifications/admin-notification.routes";
import adminDashboardRoutes from "./modules/admin/dashboard/admin-dashboard.routes";
import adminReportRoutes from "./modules/admin/reports/admin-report.routes";
import locationRoutes from "./modules/location/location.routes";
import categoryRoutes from "./modules/categories/category.routes";
import userRoutes from "./modules/users/user.routes";
import favoriteRoutes from "./modules/favorites/favorite.routes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/salons", salonRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/settlements", settlementRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin/salons", adminSalonRoutes);
app.use("/api/admin/bookings", adminBookingRoutes);
app.use("/api/admin/customers", adminCustomerRoutes);
app.use("/api/admin/services", adminServiceRoutes);
app.use("/api/admin/payments", adminPaymentRoutes);
app.use("/api/admin/settlements", adminSettlementRoutes);
app.use("/api/admin/reviews", adminReviewRoutes);
app.use("/api/admin/offers", adminOfferRoutes);
app.use("/api/admin/notifications", adminNotificationRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/admin/reports", adminReportRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/favorites", favoriteRoutes);

app.get("/", (_req, res) => {
  res.json({
    message: "Salon Backend API is running",
  });
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});