const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { isLoggedIn } = require("../middleware"); // Ensure this is defined correctly
const Listing = require("../models/listing");

// 📌 POST: Stripe checkout session (booking logic)
router.post("/create-checkout-session", isLoggedIn, paymentController.createCheckoutSession);

// 📌 GET: Payment success
router.get("/success", isLoggedIn, paymentController.paymentSuccess);

// 📌 GET: Payment cancel
router.get("/cancel", isLoggedIn, paymentController.paymentCancel);

// 📌 GET: Render booking form page
router.get("/book/:listingId", isLoggedIn, async (req, res) => {
    try {
        const listing = await Listing.findById(req.params.listingId);
        if (!listing) {
            req.flash("error", "Listing not found.");
            return res.redirect("/listings");
        }
        res.render("payments/bookingForm", { listing });
    } catch (err) {
        console.error("Booking form error:", err);
        req.flash("error", "Error loading booking form.");
        res.redirect("/listings");
    }
});

module.exports = router;
