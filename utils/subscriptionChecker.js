const User = require("../models/user");

/**
 * Check and downgrade a specific user's expired subscription
 * @param {String} userId - User ID to check
 * @returns {Boolean} - True if user was downgraded, false otherwise
 */
async function checkAndDowngradeExpired(userId) {
    try {
        const user = await User.findById(userId);
        if (!user) return false;
        
        // Check if Pro subscription has expired
        if (user.subscription === 'pro' && user.subscriptionExpiry) {
            const now = new Date();
            if (user.subscriptionExpiry < now) {
                user.subscription = 'free';
                user.subscriptionExpiry = null;
                await user.save();
                console.log(`⬇️  Downgraded user ${user.username} to free tier (expired)`);
                return true;
            }
        }
        
        return false;
    } catch (error) {
        console.error('Error checking user subscription:', error);
        return false;
    }
}

/**
 * Check and downgrade all expired Pro subscriptions (for cron job)
 * Run this daily via cron job or scheduler
 */
async function checkExpiredSubscriptions() {
    try {
        const now = new Date();
        
        // Find all Pro users with expired subscriptions
        const expiredUsers = await User.find({
            subscription: 'pro',
            subscriptionExpiry: { $lt: now }
        });

        console.log(`Found ${expiredUsers.length} expired Pro subscriptions`);

        // Downgrade them to free
        for (const user of expiredUsers) {
            user.subscription = 'free';
            user.subscriptionExpiry = null;
            await user.save();
            console.log(`Downgraded user ${user.username} to free tier`);
        }

        return expiredUsers.length;
    } catch (error) {
        console.error('Error checking expired subscriptions:', error);
        return 0;
    }
}

/**
 * Check if user's subscription is expiring soon (within 7 days)
 */
function isExpiringSoon(user) {
    if (!user.isPro || !user.isPro()) return false;
    
    const now = new Date();
    const expiryDate = new Date(user.subscriptionExpiry);
    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
}

/**
 * Get days until subscription expires
 */
function getDaysUntilExpiry(user) {
    if (!user.subscriptionExpiry) return null;
    
    const now = new Date();
    const expiryDate = new Date(user.subscriptionExpiry);
    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    
    return daysUntilExpiry;
}

module.exports = {
    checkAndDowngradeExpired,
    checkExpiredSubscriptions,
    isExpiringSoon,
    getDaysUntilExpiry
};

// Made with Bob
