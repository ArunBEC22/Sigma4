const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const User = require("../models/user");
const { isLoggedIn } = require("../middleware");

// Show Pro upgrade page
router.get("/upgrade", isLoggedIn, (req, res) => {
    res.render("subscription/upgrade.ejs");
});

// Create Stripe checkout session for Pro subscription
router.post("/create-checkout", isLoggedIn, async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: "WanderLust Pro Subscription",
                            description: "1 Month Pro Access - AI Assistant & Activity Feed"
                        },
                        unit_amount: 999, // $9.99 in cents
                    },
                    quantity: 1,
                },
            ],
            success_url: `${req.protocol}://${req.get("host")}/subscription/success?userId=${userId}`,
            cancel_url: `${req.protocol}://${req.get("host")}/subscription/cancel`,
        });

        res.redirect(303, session.url);
    } catch (err) {
        console.error("Stripe Checkout Error:", err);
        req.flash("error", "Payment session failed. Please try again.");
        res.redirect("/subscription/upgrade");
    }
});

// Handle successful payment
router.get("/success", isLoggedIn, async (req, res) => {
    try {
        const userId = req.query.userId;

        if (!userId || userId !== req.user._id.toString()) {
            req.flash("error", "Invalid subscription request.");
            return res.redirect("/listings");
        }

        // Update user to Pro subscription
        const user = await User.findById(userId);
        if (!user) {
            req.flash("error", "User not found.");
            return res.redirect("/listings");
        }

        // Set Pro subscription for 1 month
        user.subscription = 'pro';
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1);
        user.subscriptionExpiry = expiryDate;
        await user.save();

        req.flash("success", `🎉 Welcome to Pro! Your subscription is active until ${expiryDate.toDateString()}`);
        res.redirect("/listings");
    } catch (err) {
        console.error("Error in subscription success:", err);
        req.flash("error", "Error activating subscription.");
        res.redirect("/listings");
    }
});

// Handle cancelled payment
router.get("/cancel", isLoggedIn, (req, res) => {
    req.flash("error", "Subscription upgrade was cancelled.");
    res.redirect("/subscription/upgrade");
});

module.exports = router;

// Made with Bob
