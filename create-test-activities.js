if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const mongoose = require("mongoose");
const Activity = require("./models/activity");
const Listing = require("./models/listing");
const User = require("./models/user");
const Booking = require("./models/bookings");
const Review = require("./models/review");

// Connect to MongoDB using environment variable
const dbUrl = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/wanderlust";
mongoose.connect(dbUrl);

async function createTestActivities() {
    console.log("\n🎬 Creating Test Activities for Activity Feed\n");
    console.log("=" .repeat(60));

    try {
        // Check if we have listings
        const listingCount = await Listing.countDocuments();
        if (listingCount === 0) {
            console.log("\n⚠️  No listings found in database!");
            console.log("Please create some listings first through the admin panel.");
            console.log("Then run this script again.\n");
            await mongoose.connection.close();
            return;
        }

        // Get some random listings
        const listings = await Listing.find().limit(5);
        console.log(`\n✅ Found ${listings.length} listings to use for test activities\n`);

        // Clear existing activities (optional)
        const existingCount = await Activity.countDocuments();
        if (existingCount > 0) {
            console.log(`⚠️  Found ${existingCount} existing activities.`);
            console.log("Clearing them to start fresh...");
            await Activity.deleteMany({});
            console.log("✅ Cleared existing activities\n");
        }

        // Create test activities
        const activities = [];
        const now = new Date();

        // Create 10 booking activities
        console.log("📝 Creating booking activities...");
        for (let i = 0; i < 10; i++) {
            const listing = listings[Math.floor(Math.random() * listings.length)];
            const userName = Activity.generateAnonymousName();
            const minutesAgo = Math.floor(Math.random() * 120); // Random time in last 2 hours
            
            const activity = await Activity.create({
                type: 'booking',
                userName: userName,
                listing: listing._id,
                listingTitle: listing.title,
                location: listing.location,
                metadata: {
                    checkIn: new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)), // 7 days from now
                    checkOut: new Date(now.getTime() + (10 * 24 * 60 * 60 * 1000)), // 10 days from now
                    amount: listing.price * 3
                },
                createdAt: new Date(now.getTime() - (minutesAgo * 60 * 1000))
            });
            
            activities.push(activity);
            console.log(`   ✓ ${userName} booked ${listing.title} (${minutesAgo} min ago)`);
        }

        // Create 8 review activities
        console.log("\n📝 Creating review activities...");
        for (let i = 0; i < 8; i++) {
            const listing = listings[Math.floor(Math.random() * listings.length)];
            const userName = Activity.generateAnonymousName();
            const rating = Math.floor(Math.random() * 2) + 4; // 4 or 5 stars
            const minutesAgo = Math.floor(Math.random() * 180); // Random time in last 3 hours
            
            const activity = await Activity.create({
                type: 'review',
                userName: userName,
                listing: listing._id,
                listingTitle: listing.title,
                location: listing.location,
                rating: rating,
                metadata: {
                    comment: 'Great place to stay! Highly recommended.'
                },
                createdAt: new Date(now.getTime() - (minutesAgo * 60 * 1000))
            });
            
            activities.push(activity);
            console.log(`   ✓ ${userName} reviewed ${listing.title} (${rating}⭐, ${minutesAgo} min ago)`);
        }

        // Update listing stats
        console.log("\n📊 Updating listing statistics...");
        for (const listing of listings) {
            await Listing.findByIdAndUpdate(listing._id, {
                viewCount: Math.floor(Math.random() * 100) + 50,
                currentViewers: Math.floor(Math.random() * 5) + 1,
                bookingCount: Math.floor(Math.random() * 20) + 5,
                weeklyBookings: Math.floor(Math.random() * 5) + 1,
                lastBookedAt: new Date(now.getTime() - (Math.random() * 24 * 60 * 60 * 1000)),
                trustScore: Math.floor(Math.random() * 30) + 70, // 70-100
                isVerified: Math.random() > 0.3,
                isSuperhost: Math.random() > 0.6,
                instantBooking: Math.random() > 0.5,
                responseTime: ['instant', 'fast', 'moderate'][Math.floor(Math.random() * 3)]
            });
            console.log(`   ✓ Updated stats for ${listing.title}`);
        }

        console.log("\n" + "=".repeat(60));
        console.log(`\n✅ Successfully created ${activities.length} test activities!`);
        console.log("\n📱 Now check your website - the activity feed should show:");
        console.log("   • Recent bookings");
        console.log("   • Recent reviews");
        console.log("   • Updated listing statistics");
        console.log("\n💡 The feed updates every 30 seconds automatically.");
        console.log("💡 Activities will auto-delete after 7 days (TTL index).\n");

        // Show sample of what was created
        console.log("📋 Sample Activities Created:");
        const recentActivities = await Activity.find()
            .sort({ createdAt: -1 })
            .limit(5);
        
        recentActivities.forEach((activity, index) => {
            const timeAgo = Math.floor((now - activity.createdAt) / 60000);
            console.log(`   ${index + 1}. ${activity.type.toUpperCase()}: ${activity.userName} - ${activity.listingTitle} (${timeAgo} min ago)`);
        });

        console.log("\n");

    } catch (error) {
        console.error("\n❌ Error creating test activities:", error);
    } finally {
        await mongoose.connection.close();
        console.log("Database connection closed.\n");
    }
}

// Run the script
createTestActivities();

// Made with Bob
