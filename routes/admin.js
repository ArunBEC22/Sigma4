const express = require("express");
const router = express.Router();
const passport = require("passport");
const wrapAsync = require("../utils/wrapAsync.js");
const adminController = require("../controllers/adminController.js");
const { isAdmin, saveRedirectUrl } = require("../middleware.js");

// Admin Login Routes
router.get("/login", adminController.renderAdminLogin);

router.post("/login",
    saveRedirectUrl,
    passport.authenticate("local", {
        failureRedirect: "/admin/login",
        failureFlash: true
    }),
    adminController.adminLogin
);

// Admin Dashboard (Protected Routes)
router.get("/dashboard", isAdmin, wrapAsync(adminController.renderDashboard));

// Bookings Management
router.get("/bookings", isAdmin, wrapAsync(adminController.getAllBookings));
router.get("/bookings/:id", isAdmin, wrapAsync(adminController.getBookingDetails));
router.put("/bookings/:id", isAdmin, wrapAsync(adminController.updateBookingStatus));

// Listings Management
router.get("/listings", isAdmin, wrapAsync(adminController.renderAdminListings));

// Reports & Insights
router.get("/reports", isAdmin, wrapAsync(adminController.renderReports));

// Users Management
router.get("/users", isAdmin, wrapAsync(adminController.getAllUsers));

// Calendar
router.get("/calendar", isAdmin, wrapAsync(adminController.renderCalendar));
router.get("/api/calendar-data", isAdmin, wrapAsync(adminController.getCalendarData));

// Export
router.get("/export/bookings", isAdmin, wrapAsync(adminController.exportBookings));

// Admin Logout
router.get("/logout", (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash("success", "Logged out successfully!");
        res.redirect("/admin/login");
    });
});

module.exports = router;

// Made with Bob
