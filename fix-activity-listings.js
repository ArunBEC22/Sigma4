if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const mongoose = require("mongoose");
const Activity = require("./models/activity");
const Listing = require("./models/listing");

// Connect to MongoDB using environment variable
const dbUrl = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/wanderlust";
mongoose.connect(dbUrl);

async function fixActivityListings() {
    console.log("\n🔧 Fixing Activity Listings\n");
    console.log("=" .repeat(60));

    try {
        // Get all existing listings
        const listings = await Listing.find();
        console.log(`\n✅ Found ${listings.length} listings in database\n`);

        if (listings.length === 0) {
            console.log("⚠️  No listings found! Please create some listings first.");
            await mongoose.connection.close();
            return;
        }

        // Show available listings
        console.log("Available Listings:");
        listings.forEach((listing, index) => {
            console.log(`   ${index + 1}. ${listing.title} (ID: ${listing._id})`);
        });

        // Get all activities
        const activities = await Activity.find();
        console.log(`\n📊 Found ${activities.length} activities\n`);

        if (activities.length === 0) {
            console.log("⚠️  No activities found! Run create-test-activities.js first.");
            await mongoose.connection.close();
            return;
        }

        // Check and fix activities with invalid listing IDs
        let fixedCount = 0;
        let validCount = 0;

        for (const activity of activities) {
            if (!activity.listing) {
                // Activity has no listing, assign a random one
                const randomListing = listings[Math.floor(Math.random() * listings.length)];
                activity.listing = randomListing._id;
                activity.listingTitle = randomListing.title;
                activity.location = randomListing.location;
                await activity.save();
                fixedCount++;
                console.log(`   ✓ Fixed activity ${activity._id} - assigned to "${randomListing.title}"`);
            } else {
                // Check if listing exists
                const listingExists = await Listing.findById(activity.listing);
                if (!listingExists) {
                    // Listing doesn't exist, assign a random valid one
                    const randomListing = listings[Math.floor(Math.random() * listings.length)];
                    activity.listing = randomListing._id;
                    activity.listingTitle = randomListing.title;
                    activity.location = randomListing.location;
                    await activity.save();
                    fixedCount++;
                    console.log(`   ✓ Fixed activity ${activity._id} - reassigned to "${randomListing.title}"`);
                } else {
                    validCount++;
                }
            }
        }

        console.log("\n" + "=".repeat(60));
        console.log(`\n✅ Fixed ${fixedCount} activities`);
        console.log(`✅ ${validCount} activities were already valid`);
        console.log("\n💡 Now all activities point to existing listings!");
        console.log("💡 Refresh your website and click on activities - they should work now.\n");

    } catch (error) {
        console.error("\n❌ Error fixing activities:", error);
    } finally {
        await mongoose.connection.close();
        console.log("Database connection closed.\n");
    }
}

// Run the fix
fixActivityListings();

// Made with Bob
