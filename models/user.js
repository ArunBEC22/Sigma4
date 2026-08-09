const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: false, // not required for local, but for Google login we use it
    unique: false
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple docs without googleId
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  subscription: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free'
  },
  subscriptionExpiry: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Method to check if user has active Pro subscription
userSchema.methods.isPro = function() {
  if (this.subscription === 'pro') {
    // Check if subscription hasn't expired
    if (!this.subscriptionExpiry || this.subscriptionExpiry > new Date()) {
      return true;
    }
  }
  return false;
};

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
