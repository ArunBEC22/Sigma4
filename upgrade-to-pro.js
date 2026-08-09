if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const mongoose = require("mongoose");
const User = require("./models/user");

// Connect to MongoDB using environment variable
const dbUrl = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/wanderlust";
mongoose.connect(dbUrl);

async function upgradeUserToPro() {
    console.log("\n🚀 Upgrade User to Pro Subscription\n");
    console.log("=" .repeat(60));

    try {
        // Get username from command line argument
        const username = process.argv[2];

        if (!username) {
            console.log("\n❌ Please provide a username!");
            console.log("\nUsage: node upgrade-to-pro.js <username>");
            console.log("Example: node upgrade-to-pro.js demo\n");
            await mongoose.connection.close();
            return;
        }

        // Find the user
        const user = await User.findOne({ username: username });

        if (!user) {
            console.log(`\n❌ User "${username}" not found!`);
            console.log("\nAvailable users:");
            const allUsers = await User.find({}, 'username subscription');
            allUsers.forEach(u => {
                console.log(`   - ${u.username} (${u.subscription || 'free'})`);
            });
            console.log("");
            await mongoose.connection.close();
            return;
        }

        // Check current subscription
        console.log(`\n📋 Current Status for "${username}":`);
        console.log(`   Subscription: ${user.subscription || 'free'}`);
        console.log(`   Expiry: ${user.subscriptionExpiry || 'N/A'}`);

        // Upgrade to Pro
        user.subscription = 'pro';
        // Set expiry to 1 year from now
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        user.subscriptionExpiry = expiryDate;
        
        await user.save();

        console.log(`\n✅ Successfully upgraded "${username}" to Pro!`);
        console.log(`\n📋 New Status:`);
        console.log(`   Subscription: ${user.subscription}`);
        console.log(`   Expiry: ${user.subscriptionExpiry.toDateString()}`);
        console.log(`\n💡 Pro Features Unlocked:`);
        console.log(`   ✓ AI Chatbot (Automatic Booking Assistant)`);
        console.log(`   ✓ Activity Feed (Recent Activity Widget)`);
        console.log(`   ✓ Real-time Social Proof`);
        console.log(`   ✓ Priority Support`);
        console.log(`\n🎉 User can now access all Pro features!\n`);

    } catch (error) {
        console.error("\n❌ Error upgrading user:", error);
    } finally {
        await mongoose.connection.close();
        console.log("Database connection closed.\n");
    }
}

// Run the upgrade
upgradeUserToPro();

// Made with Bob
