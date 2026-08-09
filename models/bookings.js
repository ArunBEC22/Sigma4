const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  listing: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
  checkinDate: { type: Date, required: true },
  checkoutDate: { type: Date, required: true },
  stayDays: { type: Number, required: true, min: 1 },
  guests: { type: Number, required: true, min: 1, default: 1 },
  amount: { type: Number, required: true },
  
  // Payment and status fields
  status: {
    type: String,
    enum: ['pending_payment', 'confirmed', 'payment_failed', 'cancelled'],
    default: 'pending_payment'
  },
  paymentId: String,
  transactionId: String,
  paymentStatus: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  stripeSessionId: String,
  
  // Fraud detection
  fraudCheckPassed: {
    type: Boolean,
    default: false
  },
  fraudScore: Number,
  
  // Chat integration
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: "Conversation"
  },
  
  // Booking expiry for pending payments
  expiresAt: Date,
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update updatedAt on save
bookingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for efficient queries
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ listing: 1 });
bookingSchema.index({ stripeSessionId: 1 });
bookingSchema.index({ expiresAt: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
