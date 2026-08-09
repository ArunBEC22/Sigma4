const  Review = require("../models/review");
const  listing = require("../models/listing");
const activityLogger = require("../utils/activityLogger");


module.exports.createReview = async(req,res)=>{
    let list = await listing.findById(req.params.id);
    let newReview = new Review(req.body.review);
    newReview.author = req.user._id;
    console.log(newReview);
    list.reviews.push(newReview);
    await newReview.save();
    await list.save();
    
    // Log review activity for social proof
    await activityLogger.logReview(newReview, list);
    
    // Update trust score
    await activityLogger.calculateTrustScore(list._id);
    
    req.flash("success","Review Created");
    res.redirect(`/listings/${list._id}`);
}

module.exports.destroyRoute =  async (req,res) => {
    let { id, reviewId} = req.params;
 
    // Get the review before deleting to find associated activity
    const review = await Review.findById(reviewId);
    
    await listing.findByIdAndUpdate(id,{$pull : {reviews : reviewId}});
    await Review.findByIdAndDelete(reviewId);
    
    // Remove associated activity from activity feed
    if (review) {
        const Activity = require("../models/activity");
        
        console.log(`🔍 Looking for activity to delete:`, {
            type: 'review',
            listing: id,
            rating: review.rating,
            reviewCreatedAt: review.createdAt
        });
        
        // Delete activity that matches this review (by rating and approximate time)
        // Using 60 second window to account for any delays
        const deletedActivities = await Activity.deleteMany({
            type: 'review',
            listing: id,
            rating: review.rating,
            createdAt: {
                $gte: new Date(review.createdAt.getTime() - 60000), // 60 seconds before
                $lte: new Date(review.createdAt.getTime() + 60000)  // 60 seconds after
            }
        });
        
        console.log(`🗑️ Deleted ${deletedActivities.deletedCount} review activity/activities for listing ${id}`);
        
        if (deletedActivities.deletedCount === 0) {
            console.log(`⚠️ Warning: No matching activity found to delete`);
            // Try to find any review activities for this listing
            const allReviewActivities = await Activity.find({
                type: 'review',
                listing: id
            }).sort({ createdAt: -1 }).limit(5);
            console.log(`📋 Recent review activities for this listing:`, allReviewActivities.map(a => ({
                rating: a.rating,
                createdAt: a.createdAt
            })));
        }
    }
    
    // Recalculate trust score after review deletion
    await activityLogger.calculateTrustScore(id);
    
    req.flash("success","Review Deleted");
    res.redirect(`/listings/${id}`);
 };