const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");

const listingSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    description: String,
    image: {
        url: String,
        filename: String,
    },
    price: Number,

    // Original fields
    location: String,
    country: String,

    // ✅ New: validated full address
    formattedAddress: String,

    // ✅ New: coordinates from Nominatim
    coordinates: {
        lat: String,
        lon: String,
    },

    category: {
        type: String,
        enum: [
            "Trending",
            "Rooms",
            "Iconic-Cities",
            "Mountains",
            "Castles",
            "Amazing-Pools",
            "Camping",
            "Farms",
            "Doms",
            "Boats",
            "Historical-Homes",
        ],
        required: true,
    },
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: "Review",
        },
    ],
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    
    // Social Proof Fields
    viewCount: {
        type: Number,
        default: 0
    },
    currentViewers: {
        type: Number,
        default: 0
    },
    lastViewedAt: {
        type: Date
    },
    bookingCount: {
        type: Number,
        default: 0
    },
    weeklyBookings: {
        type: Number,
        default: 0
    },
    lastBookedAt: {
        type: Date
    },
    isSuperhost: {
        type: Boolean,
        default: false
    },
    trustScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    responseTime: {
        type: String,
        enum: ['instant', 'fast', 'moderate', 'slow'],
        default: 'moderate'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    instantBooking: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Cascade delete reviews
listingSchema.post("findOneAndDelete", async (listing) => {
    if (listing) {
        await Review.deleteMany({ _id: { $in: listing.reviews } });
    }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
