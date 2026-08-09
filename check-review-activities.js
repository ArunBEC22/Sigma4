/**
 * Quick script to check review activities in the database
 * Run this after creating a review to verify it was logged
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Activity = require('./models/activity');

async function checkReviewActivities() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('✅ Connected to database\n');

        // Get all activities
        const totalActivities = await Activity.countDocuments();
        console.log(`📊 Total activities: ${totalActivities}`);

        // Get review activities
        const reviewCount = await Activity.countDocuments({ type: 'review' });
        console.log(`⭐ Review activities: ${reviewCount}\n`);

        // Get recent review activities
        const recentReviews = await Activity.find({ type: 'review' })
            .sort({ createdAt: -1 })
            .limit(10);

        if (recentReviews.length > 0) {
            console.log('🔍 Recent review activities:\n');
            recentReviews.forEach((activity, index) => {
                const timeAgo = getTimeAgo(activity.createdAt);
                console.log(`${index + 1}. ${activity.userName} left a ${activity.rating}⭐ review`);
                console.log(`   Listing: ${activity.listingTitle}`);
                console.log(`   Location: ${activity.location}`);
                console.log(`   Time: ${timeAgo} (${activity.createdAt.toLocaleString()})`);
                console.log('');
            });
        } else {
            console.log('⚠️  No review activities found!\n');
            console.log('Possible reasons:');
            console.log('1. No reviews have been created yet');
            console.log('2. All review activities are older than 7 days (auto-deleted)');
            console.log('3. Activity logging is not working\n');
        }

        // Get all recent activities (any type)
        console.log('📋 All recent activities (last 10):\n');
        const allRecent = await Activity.find()
            .sort({ createdAt: -1 })
            .limit(10);

        allRecent.forEach((activity, index) => {
            const icon = activity.type === 'booking' ? '🏠' : 
                        activity.type === 'review' ? '⭐' : 
                        activity.type === 'search' ? '🔍' : '👀';
            console.log(`${index + 1}. ${icon} ${activity.type.toUpperCase()} - ${activity.userName}`);
            console.log(`   ${getTimeAgo(activity.createdAt)}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Done!');
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + ' days ago';
    return date.toLocaleDateString();
}

checkReviewActivities();

// Made with Bob
