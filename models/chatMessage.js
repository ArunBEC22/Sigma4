const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const chatMessageSchema = new Schema({
  conversation: {
    type: Schema.Types.ObjectId,
    ref: "Conversation",
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system', 'tool'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  toolCalls: [{
    toolName: {
      type: String,
      enum: [
        'searchListings',
        'getListingDetails',
        'calculateBookingPrice',
        'createBooking',
        'initiatePayment',
        'verifyPayment',
        'detectFraudListing',
        'getListingReviews',
        'recommendListings'
      ]
    },
    parameters: Schema.Types.Mixed,
    result: Schema.Types.Mixed,
    executedAt: Date,
    success: Boolean,
    error: String
  }],
  metadata: {
    intent: {
      type: String,
      enum: [
        'search_listings',
        'get_details',
        'view_details',
        'book_stay',
        'book_listing',
        'booking_confirmed',
        'get_reviews',
        'price_inquiry',
        'general_query',
        'confirmation',
        'cancellation'
      ]
    },
    entities: Schema.Types.Mixed,
    confidence: Number,
    listingCards: [{
      type: Schema.Types.ObjectId,
      ref: "Listing"
    }],
    requiresAction: {
      type: Boolean,
      default: false
    },
    actionType: String,
    processingTime: Number
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
chatMessageSchema.index({ conversation: 1, timestamp: 1 });
chatMessageSchema.index({ role: 1 });

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
module.exports = ChatMessage;

// Made with Bob
