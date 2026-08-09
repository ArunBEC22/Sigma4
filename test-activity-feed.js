/**
 * Test script to check activity feed functionality
 */

const mongoose = require("mongoose");
require('dotenv').config();

const Activity = require("./models/activity");
const Listing = require("./models/listing");
const Booking = require("./models/bookings");

async function testActivityFeed() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGO_URL);
        console.log("✅ Connected to database");

        // Check if Activity model exists
        console.log("\n📊 Checking Activity collection...");
        const activityCount = await Activity.countDocuments();
        console.log(`Total activities: ${activityCount}`);

        // Get recent activities
        const recentActivities = await Activity.find()
            .sort({ createdAt: -1 })
            .limit(10);
        
        console.log("\n🔥 Recent Activities:");
        if (recentActivities.length === 0) {
            console.log("❌ No activities found!");
            console.log("\nThis means activities are not being logged.");
            console.log("Let's create a test activity...");
            
            // Create a test activity
            const testActivity = await Activity.create({
                type: 'booking',
                userName: 'Test User',
                listingTitle: 'Test Listing',
                location: 'Mumbai',
                metadata: { test: true }
            });
            
            console.log("✅ Test activity created:", testActivity);
        } else {
            recentActivities.forEach((activity, index) => {
                console.log(`${index + 1}. [${activity.type}] ${activity.userName} - ${activity.listingTitle || 'N/A'}`);
                console.log(`   Created: ${activity.createdAt}`);
            });
        }

        // Check listings for social proof fields
        console.log("\n🏠 Checking Listings...");
        const listings = await Listing.find().limit(5);
        console.log(`Total listings: ${await Listing.countDocuments()}`);
        
        if (listings.length > 0) {
            const listing = listings[0];
            console.log("\nSample listing social proof fields:");
            console.log(`- viewCount: ${listing.viewCount || 0}`);
            console.log(`- currentViewers: ${listing.currentViewers || 0}`);
            console.log(`- bookingCount: ${listing.bookingCount || 0}`);
            console.log(`- weeklyBookings: ${listing.weeklyBookings || 0}`);
            console.log(`- trustScore: ${listing.trustScore || 0}`);
            console.log(`- isSuperhost: ${listing.isSuperhost || false}`);
        }

        // Check bookings
        console.log("\n📅 Checking Bookings...");
        const bookingCount = await Booking.countDocuments();
        console.log(`Total bookings: ${bookingCount}`);
        
        const recentBookings = await Booking.find()
            .sort({ createdAt: -1 })
            .limit(3)
            .populate('listing', 'title')
            .populate('user', 'username');
        
        if (recentBookings.length > 0) {
            console.log("\nRecent bookings:");
            recentBookings.forEach((booking, index) => {
                console.log(`${index + 1}. ${booking.user?.username || 'Unknown'} booked ${booking.listing?.title || 'Unknown'}`);
                console.log(`   Status: ${booking.status}, Created: ${booking.createdAt}`);
            });
        }

        console.log("\n✅ Test complete!");
        
    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await mongoose.connection.close();
        console.log("\n🔌 Database connection closed");
    }
}

testActivityFeed();

// Made with Bob
