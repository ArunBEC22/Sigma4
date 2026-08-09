const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const activitySchema = new Schema({
    type: {
        type: String,
        enum: ['booking', 'review', 'view', 'search'],
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    listing: {
        type: Schema.Types.ObjectId,
        ref: "Listing"
    },
    listingTitle: {
        type: String
    },
    location: {
        type: String
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    metadata: {
        type: Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Index for efficient queries
activitySchema.index({ createdAt: -1 });
activitySchema.index({ listing: 1, createdAt: -1 });
activitySchema.index({ type: 1, createdAt: -1 });

// Auto-delete activities older than 7 days
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 }); // 7 days

// Static method to get recent activities
activitySchema.statics.getRecent = function(limit = 10) {
    return this.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('listing', 'title location image');
};

// Static method to get activities for a specific listing
activitySchema.statics.getForListing = function(listingId, limit = 5) {
    return this.find({ listing: listingId })
        .sort({ createdAt: -1 })
        .limit(limit);
};

// Method to generate anonymous user name
activitySchema.statics.generateAnonymousName = function() {
    const firstNames = ['Rahul', 'Priya', 'Amit', 'Sneha', 'Rohan', 'Anjali', 'Vikram', 'Neha', 'Arjun', 'Kavya', 'Aditya', 'Riya', 'Karan', 'Pooja', 'Siddharth'];
    const lastInitials = ['K', 'S', 'P', 'M', 'R', 'V', 'A', 'N', 'J', 'D'];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastInitial = lastInitials[Math.floor(Math.random() * lastInitials.length)];
    
    return `${firstName} ${lastInitial}.`;
};

const Activity = mongoose.model("Activity", activitySchema);
module.exports = Activity;

// Made with Bob