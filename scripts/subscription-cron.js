/**
 * Subscription Expiry Cron Job
 * 
 * This script checks for expired Pro subscriptions and downgrades them to free tier.
 * Run this script daily using a cron job or task scheduler.
 * 
 * Usage:
 * - Manual: node scripts/subscription-cron.js
 * - Cron (daily at midnight): 0 0 * * * cd /path/to/project && node scripts/subscription-cron.js
 */

if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const mongoose = require("mongoose");
const User = require("../models/user");

async function checkExpiredSubscriptions() {
    try {
        console.log("🔍 Checking for expired Pro subscriptions...");
        
        // Connect to database
        await mongoose.connect(process.env.MONGO_URL);
        console.log("✅ Connected to database");
        
        // Find all Pro users with expired subscriptions
        const now = new Date();
        const expiredUsers = await User.find({
            subscription: 'pro',
            subscriptionExpiry: { $lt: now }
        });
        
        if (expiredUsers.length === 0) {
            console.log("✅ No expired subscriptions found");
            await mongoose.connection.close();
            return;
        }
        
        console.log(`⚠️  Found ${expiredUsers.length} expired subscription(s)`);
        
        // Downgrade each expired user
        let downgraded = 0;
        for (const user of expiredUsers) {
            user.subscription = 'free';
            user.subscriptionExpiry = null;
            await user.save();
            downgraded++;
            console.log(`   ↓ Downgraded: ${user.email} (expired on ${user.subscriptionExpiry})`);
        }
        
        console.log(`✅ Successfully downgraded ${downgraded} user(s) to free tier`);
        
        // Close database connection
        await mongoose.connection.close();
        console.log("✅ Database connection closed");
        
    } catch (error) {
        console.error("❌ Error checking expired subscriptions:", error);
        process.exit(1);
    }
}

// Run the check
checkExpiredSubscriptions()
    .then(() => {
        console.log("✅ Subscription check completed successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Fatal error:", error);
        process.exit(1);
    });

// Made with Bob