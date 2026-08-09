/**
 * Test script to debug review activity logging
 * This will help identify why reviews aren't showing in the activity feed
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Activity = require('./models/activity');
const Review = require('./models/review');
const Listing = require('./models/listing');

async function testReviewActivity() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGO_URL);
        console.log('✅ Connected to database');

        // 1. Check if there are any activities in the database
        const allActivities = await Activity.find().sort({ createdAt: -1 }).limit(20);
        console.log('\n📊 Total activities in database:', allActivities.length);
        
        if (allActivities.length > 0) {
            console.log('\n🔍 Recent activities:');
            allActivities.forEach((activity, index) => {
                console.log(`${index + 1}. Type: ${activity.type}, Created: ${activity.createdAt}, Listing: ${activity.listingTitle || 'N/A'}`);
            });
        }

        // 2. Check specifically for review activities
        const reviewActivities = await Activity.find({ type: 'review' }).sort({ createdAt: -1 }).limit(10);
        console.log('\n⭐ Review activities found:', reviewActivities.length);
        
        if (reviewActivities.length > 0) {
            console.log('\n🔍 Recent review activities:');
            reviewActivities.forEach((activity, index) => {
                console.log(`${index + 1}. User: ${activity.userName}, Rating: ${activity.rating}, Listing: ${activity.listingTitle}, Created: ${activity.createdAt}`);
            });
        } else {
            console.log('⚠️  No review activities found in the database!');
        }

        // 3. Check recent reviews in the Review collection
        const recentReviews = await Review.find().sort({ createdAt: -1 }).limit(10).populate('author');
        console.log('\n📝 Recent reviews in Review collection:', recentReviews.length);
        
        if (recentReviews.length > 0) {
            console.log('\n🔍 Recent reviews:');
            for (const review of recentReviews) {
                console.log(`- Rating: ${review.rating}, Comment: ${review.comment?.substring(0, 50) || 'No comment'}, Created: ${review.createdAt}`);
                console.log(`  Author: ${review.author?.username || 'Unknown'}`);
            }
        }

        // 4. Check if reviews have corresponding activities
        console.log('\n🔗 Checking if reviews have corresponding activities...');
        for (const review of recentReviews.slice(0, 5)) {
            const hasActivity = await Activity.findOne({
                type: 'review',
                rating: review.rating,
                createdAt: { 
                    $gte: new Date(review.createdAt.getTime() - 5000), // 5 seconds before
                    $lte: new Date(review.createdAt.getTime() + 5000)  // 5 seconds after
                }
            });
            
            if (hasActivity) {
                console.log(`✅ Review (${review.rating}⭐) has activity`);
            } else {
                console.log(`❌ Review (${review.rating}⭐) created at ${review.createdAt} has NO activity!`);
            }
        }

        // 5. Test the Activity.getRecent() method
        console.log('\n🧪 Testing Activity.getRecent() method...');
        const recentActivitiesMethod = await Activity.getRecent(10);
        console.log(`Found ${recentActivitiesMethod.length} activities using getRecent()`);
        
        if (recentActivitiesMethod.length > 0) {
            console.log('Types:', recentActivitiesMethod.map(a => a.type).join(', '));
        }

        // 6. Check for any errors in activity creation
        console.log('\n🔍 Checking Activity schema and indexes...');
        const indexes = await Activity.collection.getIndexes();
        console.log('Indexes:', Object.keys(indexes).join(', '));

        // 7. Check TTL index (activities expire after 7 days)
        const oldActivities = await Activity.find({
            createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        });
        console.log(`\n⏰ Activities older than 7 days: ${oldActivities.length} (these will be auto-deleted)`);

        console.log('\n✅ Test completed!');
        
    } catch (error) {
        console.error('❌ Error during test:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
    }
}

// Run the test
testReviewActivity();

// Made with Bob
