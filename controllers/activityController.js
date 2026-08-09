const Activity = require("../models/activity");
const activityLogger = require("../utils/activityLogger");

// Get recent activities for activity feed
module.exports.getRecentActivities = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const activities = await Activity.getRecent(limit);
        
        // Format activities for display
        const formattedActivities = activities.map(activity => {
            let message = '';
            let icon = '';
            
            switch(activity.type) {
                case 'booking':
                    message = `${activity.userName} just booked "${activity.listingTitle}"`;
                    icon = '🏠';
                    break;
                case 'review':
                    message = `${activity.userName} left a ${activity.rating}-star review for "${activity.listingTitle}"`;
                    icon = '⭐';
                    break;
                case 'view':
                    message = `${activity.userName} is viewing "${activity.listingTitle}"`;
                    icon = '👀';
                    break;
                case 'search':
                    message = `${activity.userName} searched in ${activity.location}`;
                    icon = '🔍';
                    break;
            }
            
            // Handle both populated and non-populated listing
            let listingId = null;
            if (activity.listing) {
                if (typeof activity.listing === 'object' && activity.listing._id) {
                    // Listing is populated, extract _id
                    listingId = activity.listing._id.toString();
                } else {
                    // Listing is just an ObjectId
                    listingId = activity.listing.toString();
                }
            }
            
            return {
                id: activity._id,
                type: activity.type,
                message,
                icon,
                listingId: listingId,
                listingTitle: activity.listingTitle,
                location: activity.location,
                timestamp: activity.createdAt,
                timeAgo: getTimeAgo(activity.createdAt)
            };
        });
        
        res.json({
            success: true,
            activities: formattedActivities
        });
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch activities'
        });
    }
};

// Get social proof data for a specific listing
module.exports.getListingSocialProof = async (req, res) => {
    try {
        const { id } = req.params;
        const socialProof = await activityLogger.getSocialProof(id);
        
        if (!socialProof) {
            return res.status(404).json({
                success: false,
                error: 'Listing not found'
            });
        }
        
        res.json({
            success: true,
            socialProof
        });
    } catch (error) {
        console.error('Error fetching social proof:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch social proof'
        });
    }
};

// Get activity statistics (for admin dashboard)
module.exports.getActivityStats = async (req, res) => {
    try {
        const now = new Date();
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        // Get counts by type
        const bookingsToday = await Activity.countDocuments({
            type: 'booking',
            createdAt: { $gte: last24Hours }
        });
        
        const reviewsToday = await Activity.countDocuments({
            type: 'review',
            createdAt: { $gte: last24Hours }
        });
        
        const viewsToday = await Activity.countDocuments({
            type: 'view',
            createdAt: { $gte: last24Hours }
        });
        
        const searchesToday = await Activity.countDocuments({
            type: 'search',
            createdAt: { $gte: last24Hours }
        });
        
        // Get weekly trends
        const weeklyBookings = await Activity.countDocuments({
            type: 'booking',
            createdAt: { $gte: last7Days }
        });
        
        const weeklyReviews = await Activity.countDocuments({
            type: 'review',
            createdAt: { $gte: last7Days }
        });
        
        // Get most active listings
        const topListings = await Activity.aggregate([
            { $match: { type: 'booking', createdAt: { $gte: last7Days } } },
            { $group: { _id: '$listing', count: { $sum: 1 }, title: { $first: '$listingTitle' } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);
        
        res.json({
            success: true,
            stats: {
                today: {
                    bookings: bookingsToday,
                    reviews: reviewsToday,
                    views: viewsToday,
                    searches: searchesToday
                },
                weekly: {
                    bookings: weeklyBookings,
                    reviews: weeklyReviews
                },
                topListings
            }
        });
    } catch (error) {
        console.error('Error fetching activity stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch activity stats'
        });
    }
};

// Helper function to calculate time ago
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    
    return "just now";
}

// Made with Bob