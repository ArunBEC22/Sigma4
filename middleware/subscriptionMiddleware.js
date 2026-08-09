const subscriptionChecker = require("../utils/subscriptionChecker");

/**
 * Middleware to check and update subscription status on each request
 * Automatically downgrades expired Pro subscriptions to free tier
 */
module.exports.checkSubscriptionStatus = async (req, res, next) => {
    try {
        // Only check if user is logged in
        if (req.user && req.user._id) {
            const wasDowngraded = await subscriptionChecker.checkAndDowngradeExpired(req.user._id);
            
            if (wasDowngraded) {
                // Refresh user object to reflect changes
                const User = require("../models/user");
                req.user = await User.findById(req.user._id);
                
                // Add flash message for expired subscription
                req.flash("error", "⚠️ Your Pro subscription has expired. Upgrade again to access premium features.");
            }
        }
        next();
    } catch (err) {
        console.error("Error checking subscription status:", err);
        // Don't block the request if subscription check fails
        next();
    }
};

// Made with Bob