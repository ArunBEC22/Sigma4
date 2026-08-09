const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const conversationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  sessionId: {
    type: String,
    required: true
  },
  messages: [{
    type: Schema.Types.ObjectId,
    ref: "ChatMessage"
  }],
  context: {
    destination: String,
    checkIn: Date,
    checkOut: Date,
    guests: Number,
    budget: Number,
    propertyType: String,
    amenities: [String],
    selectedListing: {
      type: Schema.Types.ObjectId,
      ref: "Listing"
    },
    bookingPrice: Number,
    lastSearchResults: Schema.Types.Mixed,
    bookingIntent: {
      type: Boolean,
      default: false
    },
    currentStep: {
      type: String,
      enum: ['initial', 'searching', 'viewing_details', 'calculating_price', 'confirming_booking', 'payment', 'completed'],
      default: 'initial'
    }
  },
  status: {
    type: String,
    enum: ['active', 'booking_in_progress', 'completed', 'abandoned'],
    default: 'active'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update lastActivity on any change
conversationSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

// Method to get context summary
conversationSchema.methods.getContextSummary = function() {
  const summary = {
    hasDestination: !!this.context.destination,
    hasCheckIn: !!this.context.checkIn,
    hasCheckOut: !!this.context.checkOut,
    hasGuests: this.context.guests !== null && this.context.guests !== undefined,
    hasBudget: this.context.budget !== null && this.context.budget !== undefined,
    hasSelectedListing: !!this.context.selectedListing,
    isComplete: false
  };
  
  // Check if we have minimum required info for search
  summary.isComplete = summary.hasDestination && summary.hasCheckIn && summary.hasGuests;
  
  return summary;
};

// Method to get missing required fields
conversationSchema.methods.getMissingFields = function() {
  const missing = [];
  
  if (!this.context.destination) missing.push('destination');
  if (!this.context.checkIn) missing.push('check-in date');
  if (this.context.guests === null || this.context.guests === undefined) missing.push('number of guests');
  
  return missing;
};

// Index for efficient queries
conversationSchema.index({ user: 1, status: 1 });
conversationSchema.index({ sessionId: 1 });
conversationSchema.index({ lastActivity: -1 });

const Conversation = mongoose.model("Conversation", conversationSchema);
module.exports = Conversation;

// Made with Bob
