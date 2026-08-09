const Activity = require("../models/activity");
const Listing = require("../models/listing");

/**
 * Log a booking activity
 */
async function logBooking(booking, listing) {
    try {
        const userName = Activity.generateAnonymousName();
        
        await Activity.create({
            type: 'booking',
            userName: userName,
            listing: listing._id,
            listingTitle: listing.title,
            location: listing.location,
            metadata: {
                checkIn: booking.checkinDate,
                checkOut: booking.checkoutDate,
                amount: booking.amount
            }
        });

        // Update listing stats
        await Listing.findByIdAndUpdate(listing._id, {
            $inc: { bookingCount: 1, weeklyBookings: 1 },
            lastBookedAt: new Date()
        });

        console.log(`✅ Logged booking activity for ${listing.title}`);
    } catch (error) {
        console.error('Error logging booking activity:', error);
    }
}

/**
 * Log a review activity
 */
async function logReview(review, listing) {
    try {
        const userName = Activity.generateAnonymousName();
        
        const activityData = {
            type: 'review',
            userName: userName,
            listing: listing._id,
            listingTitle: listing.title,
            location: listing.location,
            rating: review.rating,
            metadata: {
                comment: review.comment ? review.comment.substring(0, 100) : ''
            }
        };
        
        const newActivity = await Activity.create(activityData);

        console.log(`✅ Logged review activity for ${listing.title}`);
        console.log(`   📝 Activity ID: ${newActivity._id}`);
        console.log(`   ⭐ Rating: ${review.rating} stars`);
        console.log(`   👤 Anonymous user: ${userName}`);
        console.log(`   🕐 Created at: ${newActivity.createdAt}`);
    } catch (error) {
        console.error('❌ Error logging review activity:', error);
        console.error('   Review data:', { rating: review.rating, listingTitle: listing.title });
    }
}

/**
 * Log a property view
 */
async function logView(listingId) {
    try {
        const listing = await Listing.findById(listingId);
        if (!listing) return;

        // Increment view count
        await Listing.findByIdAndUpdate(listingId, {
            $inc: { viewCount: 1, currentViewers: 1 },
            lastViewedAt: new Date()
        });

        // Decrement current viewers after 5 minutes
        setTimeout(async () => {
            await Listing.findByIdAndUpdate(listingId, {
                $inc: { currentViewers: -1 }
            });
        }, 5 * 60 * 1000); // 5 minutes

        console.log(`✅ Logged view for ${listing.title}`);
    } catch (error) {
        console.error('Error logging view:', error);
    }
}

/**
 * Log a search activity
 */
async function logSearch(searchParams) {
    try {
        const userName = Activity.generateAnonymousName();
        
        await Activity.create({
            type: 'search',
            userName: userName,
            location: searchParams.destination || 'Various locations',
            metadata: {
                destination: searchParams.destination,
                checkIn: searchParams.checkIn,
                checkOut: searchParams.checkOut,
                guests: searchParams.guests
            }
        });

        console.log(`✅ Logged search activity`);
    } catch (error) {
        console.error('Error logging search activity:', error);
    }
}

/**
 * Calculate trust score for a listing
 */
async function calculateTrustScore(listingId) {
    try {
        const listing = await Listing.findById(listingId).populate('reviews');
        if (!listing) return 0;

        let score = 0;

        // Reviews (40 points)
        if (listing.reviews && listing.reviews.length > 0) {
            const avgRating = listing.reviews.reduce((sum, r) => sum + r.rating, 0) / listing.reviews.length;
            score += (avgRating / 5) * 40;
        }

        // Booking count (30 points)
        const bookingScore = Math.min(listing.bookingCount / 20, 1) * 30;
        score += bookingScore;

        // Verification (15 points)
        if (listing.isVerified) score += 15;

        // Response time (10 points)
        if (listing.responseTime === 'instant') score += 10;
        else if (listing.responseTime === 'fast') score += 7;
        else if (listing.responseTime === 'moderate') score += 4;

        // Instant booking (5 points)
        if (listing.instantBooking) score += 5;

        // Update trust score
        await Listing.findByIdAndUpdate(listingId, { trustScore: Math.round(score) });

        // Check for superhost status (>80 score, >10 bookings, >4.5 rating)
        const avgRating = listing.reviews.length > 0 
            ? listing.reviews.reduce((sum, r) => sum + r.rating, 0) / listing.reviews.length 
            : 0;
        
        const isSuperhost = score > 80 && listing.bookingCount > 10 && avgRating > 4.5;
        await Listing.findByIdAndUpdate(listingId, { isSuperhost });

        return Math.round(score);
    } catch (error) {
        console.error('Error calculating trust score:', error);
        return 0;
    }
}

/**
 * Reset weekly booking counts (run this weekly via cron job)
 */
async function resetWeeklyStats() {
    try {
        await Listing.updateMany({}, { weeklyBookings: 0 });
        console.log('✅ Reset weekly booking stats');
    } catch (error) {
        console.error('Error resetting weekly stats:', error);
    }
}

/**
 * Get social proof data for a listing
 */
async function getSocialProof(listingId) {
    try {
        const listing = await Listing.findById(listingId).populate('reviews');
        if (!listing) return null;

        const recentActivities = await Activity.getForListing(listingId, 5);
        
        // Calculate average rating
        const avgRating = listing.reviews.length > 0
            ? listing.reviews.reduce((sum, r) => sum + r.rating, 0) / listing.reviews.length
            : 0;

        // Calculate recommendation percentage
        const highRatings = listing.reviews.filter(r => r.rating >= 4).length;
        const recommendationRate = listing.reviews.length > 0
            ? (highRatings / listing.reviews.length) * 100
            : 0;

        return {
            viewCount: listing.viewCount || 0,
            currentViewers: Math.max(listing.currentViewers || 0, 0),
            bookingCount: listing.bookingCount || 0,
            weeklyBookings: listing.weeklyBookings || 0,
            lastBookedAt: listing.lastBookedAt,
            trustScore: listing.trustScore || 0,
            isSuperhost: listing.isSuperhost || false,
            isVerified: listing.isVerified || false,
            instantBooking: listing.instantBooking || false,
            responseTime: listing.responseTime || 'moderate',
            avgRating: avgRating.toFixed(1),
            totalReviews: listing.reviews.length,
            recommendationRate: recommendationRate.toFixed(0),
            recentActivities: recentActivities
        };
    } catch (error) {
        console.error('Error getting social proof:', error);
        return null;
    }
}

module.exports = {
    logBooking,
    logReview,
    logView,
    logSearch,
    calculateTrustScore,
    resetWeeklyStats,
    getSocialProof
};

// Made with Bob