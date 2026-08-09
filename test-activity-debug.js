if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const mongoose = require("mongoose");
const Activity = require("./models/activity");
const Listing = require("./models/listing");
const Booking = require("./models/bookings");
const Review = require("./models/review");
const User = require("./models/user");

// Connect to MongoDB using environment variable
const dbUrl = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/wanderlust";
mongoose.connect(dbUrl);

async function debugActivityFeed() {
    console.log("\n🔍 ACTIVITY FEED DEBUG REPORT\n");
    console.log("=" .repeat(60));

    try {
        // 1. Check Activity collection
        console.log("\n1️⃣  CHECKING ACTIVITY COLLECTION:");
        const activityCount = await Activity.countDocuments();
        console.log(`   Total activities: ${activityCount}`);

        if (activityCount > 0) {
            const recentActivities = await Activity.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('listing');
            
            console.log("\n   Recent Activities:");
            recentActivities.forEach((activity, index) => {
                console.log(`   ${index + 1}. ${activity.type.toUpperCase()}`);
                console.log(`      User: ${activity.userName}`);
                console.log(`      Listing: ${activity.listingTitle}`);
                console.log(`      Location: ${activity.location}`);
                console.log(`      Created: ${activity.createdAt}`);
                if (activity.rating) console.log(`      Rating: ${activity.rating}⭐`);
                console.log("");
            });
        } else {
            console.log("   ⚠️  No activities found in database!");
        }

        // 2. Check Bookings
        console.log("\n2️⃣  CHECKING BOOKINGS:");
        const bookingCount = await Booking.countDocuments();
        console.log(`   Total bookings: ${bookingCount}`);

        if (bookingCount > 0) {
            const recentBookings = await Booking.find()
                .sort({ createdAt: -1 })
                .limit(3)
                .populate('listing')
                .populate('user');
            
            console.log("\n   Recent Bookings:");
            recentBookings.forEach((booking, index) => {
                console.log(`   ${index + 1}. Booking ID: ${booking._id}`);
                console.log(`      User: ${booking.user?.username || 'Unknown'}`);
                console.log(`      Listing: ${booking.listing?.title || 'Unknown'}`);
                console.log(`      Check-in: ${booking.checkinDate}`);
                console.log(`      Check-out: ${booking.checkoutDate || 'NOT SET ⚠️'}`);
                console.log(`      Status: ${booking.status}`);
                console.log(`      Amount: $${booking.amount}`);
                console.log("");
            });
        }

        // 3. Check Reviews
        console.log("\n3️⃣  CHECKING REVIEWS:");
        const reviewCount = await Review.countDocuments();
        console.log(`   Total reviews: ${reviewCount}`);

        if (reviewCount > 0) {
            const recentReviews = await Review.find()
                .sort({ createdAt: -1 })
                .limit(3)
                .populate('listing')
                .populate('author');
            
            console.log("\n   Recent Reviews:");
            recentReviews.forEach((review, index) => {
                console.log(`   ${index + 1}. Review ID: ${review._id}`);
                console.log(`      Author: ${review.author?.username || 'Unknown'}`);
                console.log(`      Listing: ${review.listing?.title || 'Unknown'}`);
                console.log(`      Rating: ${review.rating}⭐`);
                console.log(`      Comment: ${review.comment?.substring(0, 50)}...`);
                console.log("");
            });
        }

        // 4. Check Listings with Social Proof
        console.log("\n4️⃣  CHECKING LISTINGS (Social Proof Fields):");
        const listingCount = await Listing.countDocuments();
        console.log(`   Total listings: ${listingCount}`);

        const listingsWithStats = await Listing.find({
            $or: [
                { bookingCount: { $gt: 0 } },
                { viewCount: { $gt: 0 } },
                { trustScore: { $gt: 0 } }
            ]
        }).limit(5);

        if (listingsWithStats.length > 0) {
            console.log("\n   Listings with Activity:");
            listingsWithStats.forEach((listing, index) => {
                console.log(`   ${index + 1}. ${listing.title}`);
                console.log(`      View Count: ${listing.viewCount || 0}`);
                console.log(`      Booking Count: ${listing.bookingCount || 0}`);
                console.log(`      Weekly Bookings: ${listing.weeklyBookings || 0}`);
                console.log(`      Trust Score: ${listing.trustScore || 0}`);
                console.log(`      Is Superhost: ${listing.isSuperhost ? '✅' : '❌'}`);
                console.log(`      Last Booked: ${listing.lastBookedAt || 'Never'}`);
                console.log("");
            });
        } else {
            console.log("   ⚠️  No listings have social proof data yet!");
        }

        // 5. Test Activity API Format
        console.log("\n5️⃣  TESTING ACTIVITY API FORMAT:");
        const activities = await Activity.getRecent(5);
        console.log(`   Activities returned by API: ${activities.length}`);
        
        if (activities.length > 0) {
            console.log("\n   Sample Activity Object:");
            console.log(JSON.stringify(activities[0], null, 2));
        }

        // 6. Check TTL Index
        console.log("\n6️⃣  CHECKING TTL INDEX:");
        const indexes = await Activity.collection.getIndexes();
        const hasTTL = Object.values(indexes).some(index => index.expireAfterSeconds);
        console.log(`   TTL Index exists: ${hasTTL ? '✅' : '❌'}`);
        if (hasTTL) {
            const ttlIndex = Object.values(indexes).find(index => index.expireAfterSeconds);
            console.log(`   Expires after: ${ttlIndex.expireAfterSeconds} seconds (${ttlIndex.expireAfterSeconds / 86400} days)`);
        }

        // 7. Recommendations
        console.log("\n7️⃣  RECOMMENDATIONS:");
        if (activityCount === 0) {
            console.log("   ⚠️  No activities found. Possible issues:");
            console.log("      - Activity logging might not be triggered");
            console.log("      - Check if activityLogger is being called in payment/review controllers");
            console.log("      - Verify booking status is 'confirmed' (not 'pending_payment')");
            console.log("      - Check server logs for errors during booking/review creation");
        }
        
        if (bookingCount > 0 && activityCount === 0) {
            console.log("   ⚠️  Bookings exist but no activities logged!");
            console.log("      - This confirms activity logging is not working");
            console.log("      - Check if activityLogger.logBooking() is being called");
            console.log("      - Verify booking.checkinDate and booking.checkoutDate exist");
        }

        console.log("\n" + "=".repeat(60));
        console.log("\n✅ Debug report complete!\n");

    } catch (error) {
        console.error("\n❌ Error during debug:", error);
    } finally {
        await mongoose.connection.close();
        console.log("Database connection closed.\n");
    }
}

// Run the debug
debugActivityFeed();

// Made with Bob
