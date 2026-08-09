# AI-Powered Chat Interface Documentation

## 🎯 Overview

This document provides complete documentation for the AI-powered chat interface integrated into the Wanderlust (Airbnb-style) web application. The chatbot uses Ollama (local AI) with MCP tool architecture to help users search, view, and book accommodations through natural language conversations.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Installation & Setup](#installation--setup)
3. [Features](#features)
4. [API Endpoints](#api-endpoints)
5. [MCP Tools](#mcp-tools)
6. [Database Schema](#database-schema)
7. [Usage Examples](#usage-examples)
8. [Testing Guide](#testing-guide)
9. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface                          │
│  (Floating Chat Widget - EJS + Tailwind CSS)               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                  Chat Controller                            │
│  (Intent Classification + Entity Extraction)                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              Ollama Service (llama3:latest)                 │
│  (Natural Language Understanding)                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                  MCP Tool Service                           │
│  (9 Tools for Search, Details, Booking, Payment, etc.)     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              MongoDB + Stripe Payment                       │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: MongoDB (Mongoose ODM)
- **AI Engine**: Ollama (llama3:latest - 4.7GB model)
- **Frontend**: EJS Templates + Tailwind CSS
- **Payment**: Stripe
- **Authentication**: Passport.js

---

## 🚀 Installation & Setup

### Prerequisites

1. **Node.js** (v20.18.0 or higher)
2. **MongoDB** (running instance)
3. **Ollama** installed with llama3:latest model
4. **Stripe Account** (for payments)

### Step 1: Install Dependencies

```bash
cd /Users/arunrh/Desktop/Sigma4
npm install uuid express-rate-limit
```

### Step 2: Verify Ollama Installation

```bash
# Check if Ollama is installed
ollama list

# Should show llama3:latest (4.7 GB)
# If not installed, run:
ollama pull llama3:latest
```

### Step 3: Start Ollama Service

```bash
# Start Ollama server
ollama serve
```

Keep this terminal running. Ollama will be available at `http://localhost:11434`

### Step 4: Environment Variables

Your `.env` file should include:

```env
# Existing variables
MONGO_URL=your_mongodb_connection_string
STRIPE_SECRET_KEY=your_stripe_secret_key
SECRET=your_session_secret

# New AI Chat variables
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3:latest
CHAT_RATE_LIMIT=50
BOOKING_EXPIRY_MINUTES=15
```

### Step 5: Start Application

```bash
node app.js
```

The application will start on `http://localhost:3000`

---

## ✨ Features

### 1. **Natural Language Understanding**
- Understands conversational queries like:
  - "I want to go to Goa for 4 days with 3 friends under 6000 budget"
  - "Find me a villa in Manali next weekend"
  - "Show me details of the second property"

### 2. **Intent Classification**
Automatically detects user intent:
- `SEARCH_LISTINGS` - Search for properties
- `GET_DETAILS` - View property details
- `BOOK_STAY` - Book accommodation
- `GET_REVIEWS` - View reviews
- `PRICE_INQUIRY` - Calculate costs
- `GENERAL_QUERY` - Help and information

### 3. **Entity Extraction**
Extracts travel details from messages:
- **Destination**: Goa, Manali, Delhi, etc.
- **Dates**: "next weekend", "May 20", "15th June"
- **Guests**: Number of people
- **Budget**: Price range in INR
- **Property Type**: Villa, apartment, room, etc.

### 4. **Conversation Memory**
- Maintains context across messages
- Remembers user preferences
- Tracks booking progress

### 5. **Fraud Detection**
AI-powered safety checks:
- New listing warnings
- Price anomaly detection
- Host account age verification
- Review sentiment analysis

### 6. **Complete Booking Flow**
1. Search listings
2. View details
3. Check reviews
4. Fraud verification
5. Price calculation
6. Create booking
7. Stripe payment
8. Confirmation email

---

## 🔌 API Endpoints

### Chat Endpoints

#### 1. Start Conversation
```http
POST /chat/conversation/start
```

**Authentication**: Required (isLoggedIn middleware)

**Response**:
```json
{
  "success": true,
  "conversationId": "507f1f77bcf86cd799439011",
  "sessionId": "uuid-v4-string",
  "message": "Hello! I'm your Wanderlust travel assistant..."
}
```

#### 2. Send Message
```http
POST /chat/message
```

**Authentication**: Required

**Request Body**:
```json
{
  "conversationId": "507f1f77bcf86cd799439011",
  "message": "I want to visit Goa for 5 days"
}
```

**Response**:
```json
{
  "success": true,
  "response": "Great! I found 5 properties in Goa...",
  "listings": [...],
  "intent": "SEARCH_LISTINGS",
  "entities": {
    "destination": "Goa",
    "days": 5
  },
  "conversationContext": {...}
}
```

#### 3. Get Conversation History
```http
GET /chat/conversation/:conversationId
```

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "conversation": {
    "_id": "...",
    "messages": [...],
    "context": {...},
    "status": "active"
  }
}
```

#### 4. Get User Conversations
```http
GET /chat/conversations
```

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "conversations": [
    {
      "_id": "...",
      "sessionId": "...",
      "status": "active",
      "lastActivity": "2026-05-15T12:00:00.000Z"
    }
  ]
}
```

---

## 🛠️ MCP Tools

### Tool 1: searchListings

**Purpose**: Search for accommodations based on criteria

**Parameters**:
```javascript
{
  destination: String,      // Required
  checkIn: Date,            // Optional
  checkOut: Date,           // Optional
  guests: Number,           // Optional (default: 1)
  budget: Number,           // Optional (per night)
  category: String          // Optional
}
```

**Returns**:
```javascript
{
  success: true,
  listings: [...],
  count: 5,
  filters_applied: {...}
}
```

### Tool 2: getListingDetails

**Purpose**: Fetch complete property information

**Parameters**:
```javascript
{
  listingId: String  // Required (MongoDB ObjectId)
}
```

**Returns**:
```javascript
{
  success: true,
  listing: {...},
  rating: "4.5",
  reviewCount: 23,
  availability: true,
  host: {...}
}
```

### Tool 3: calculateBookingPrice

**Purpose**: Calculate total booking cost

**Parameters**:
```javascript
{
  listingId: String,
  checkIn: Date,
  checkOut: Date,
  guests: Number
}
```

**Returns**:
```javascript
{
  success: true,
  basePrice: 2500,
  nights: 4,
  subtotal: 10000,
  serviceFee: 1000,    // 10%
  taxes: 500,          // 5%
  total: 11500,
  breakdown: {...}
}
```

### Tool 4: createBooking

**Purpose**: Create pending booking before payment

**Parameters**:
```javascript
{
  listingId: String,
  checkIn: Date,
  checkOut: Date,
  guests: Number,
  amount: Number,
  conversationId: String
}
```

**Returns**:
```javascript
{
  success: true,
  bookingId: "...",
  status: "pending_payment",
  expiresAt: Date  // 15 minutes from creation
}
```

### Tool 5: initiatePayment

**Purpose**: Create Stripe checkout session

**Parameters**:
```javascript
{
  bookingId: String
}
```

**Returns**:
```javascript
{
  success: true,
  paymentUrl: "https://checkout.stripe.com/...",
  sessionId: "cs_...",
  expiresAt: Date
}
```

### Tool 6: verifyPayment

**Purpose**: Verify payment and update booking status

**Parameters**:
```javascript
{
  sessionId: String,
  bookingId: String
}
```

**Returns**:
```javascript
{
  success: true,
  paymentStatus: "success",
  bookingStatus: "confirmed",
  transactionId: "..."
}
```

### Tool 7: detectFraudListing

**Purpose**: AI-based fraud detection

**Parameters**:
```javascript
{
  listingId: String
}
```

**Returns**:
```javascript
{
  success: true,
  isSafe: true,
  fraudScore: 15,      // 0-100 (lower is safer)
  riskLevel: "low",    // low, medium, high
  warnings: [],
  checks: [...],
  recommendation: "This listing appears safe to book"
}
```

**Fraud Checks**:
1. Review history (20 points if no reviews)
2. Price analysis (15 points if suspiciously low)
3. Host account age (25 points if < 30 days)
4. Review sentiment (30 points if >30% negative)
5. Property details (10 points if incomplete)

### Tool 8: getListingReviews

**Purpose**: Fetch reviews and ratings

**Parameters**:
```javascript
{
  listingId: String,
  limit: Number  // Optional (default: 5)
}
```

**Returns**:
```javascript
{
  success: true,
  reviews: [...],
  averageRating: "4.5",
  totalReviews: 23,
  ratingBreakdown: {
    5: 15,
    4: 5,
    3: 2,
    2: 1,
    1: 0
  }
}
```

### Tool 9: recommendListings

**Purpose**: AI-powered recommendations

**Parameters**:
```javascript
{
  destination: String,
  budget: Number,
  tripType: String  // family, romantic, adventure, beach, luxury, budget
}
```

**Returns**:
```javascript
{
  success: true,
  recommendations: [...],
  count: 5,
  reasoning: "Based on your family trip preferences..."
}
```

---

## 💾 Database Schema

### Conversation Model

```javascript
{
  user: ObjectId,              // Reference to User
  sessionId: String,           // UUID v4
  messages: [ObjectId],        // References to ChatMessage
  context: {
    destination: String,
    checkIn: Date,
    checkOut: Date,
    guests: Number,
    budget: Number,
    propertyType: String,
    selectedListing: ObjectId,
    bookingIntent: Boolean,
    currentStep: String        // initial, searching, viewing_details, etc.
  },
  status: String,              // active, booking_in_progress, completed, abandoned
  lastActivity: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### ChatMessage Model

```javascript
{
  conversation: ObjectId,
  role: String,                // user, assistant, system, tool
  content: String,
  toolCalls: [{
    toolName: String,
    parameters: Object,
    result: Object,
    executedAt: Date,
    success: Boolean
  }],
  metadata: {
    intent: String,
    entities: Object,
    confidence: Number,
    listingCards: [ObjectId],
    requiresAction: Boolean
  },
  timestamp: Date
}
```

### Enhanced Booking Model

```javascript
{
  user: ObjectId,
  listing: ObjectId,
  checkinDate: Date,
  checkoutDate: Date,
  stayDays: Number,
  guests: Number,
  amount: Number,
  status: String,              // pending_payment, confirmed, payment_failed, cancelled
  paymentId: String,
  transactionId: String,
  paymentStatus: String,       // pending, success, failed
  stripeSessionId: String,
  fraudCheckPassed: Boolean,
  fraudScore: Number,
  conversationId: ObjectId,
  expiresAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 📝 Usage Examples

### Example 1: Simple Search

**User**: "I want to visit Goa"

**AI Response**: "I'd love to help you find a place in Goa! Could you also tell me your check-in date and number of guests?"

**User**: "Next weekend for 2 people"

**AI Response**: "I found 5 amazing properties in Goa! 🏠 Check them out below..."
[Displays listing cards]

### Example 2: Complete Booking Flow

```
User: "I want to go to Manali for 4 days with 3 friends under 8000 budget"

AI: Extracts:
  - destination: Manali
  - days: 4
  - guests: 3
  - budget: 8000

AI: "When are you planning to visit?"

User: "May 20"

AI: Calls searchListings()
    Returns 3 properties
    Displays listing cards

User: [Clicks on second property]

AI: Calls getListingDetails()
    Calls getListingReviews()
    Calls detectFraudListing()
    
AI: "📍 Mountain Villa in Manali
     Price: ₹1,800/night
     Rating: 4.7⭐ (15 reviews)
     Safety Check: ✓ This listing appears safe to book
     
     Would you like to book this property?"

User: "Yes, book it"

AI: Calls calculateBookingPrice()
    
AI: "Here's the breakdown:
     - Base: ₹1,800 × 4 nights = ₹7,200
     - Service Fee: ₹720
     - Taxes: ₹360
     - Total: ₹8,280
     
     Would you like to proceed with payment?"

User: "Yes"

AI: Calls createBooking()
    Calls initiatePayment()
    
AI: "Perfect! Redirecting you to secure payment... 🔒"
    [Redirects to Stripe]

[After payment success]

AI: "🎉 Booking confirmed! Check your email for details."
```

### Example 3: Price Inquiry

**User**: "How much will it cost for 5 nights?"

**AI**: 
```
💰 Price Breakdown

Base Price: ₹2,500 × 5 nights = ₹12,500
Service Fee (10%): ₹1,250
Taxes (5%): ₹625
Total: ₹14,375

Would you like to proceed with booking? 🏡
```

---

## 🧪 Testing Guide

### Manual Testing Checklist

#### 1. Chat Widget UI
- [ ] Chat button appears on all pages (only when logged in)
- [ ] Chat window opens/closes smoothly
- [ ] Messages display correctly
- [ ] Typing indicator shows during processing
- [ ] Listing cards render properly
- [ ] Mobile responsive design works

#### 2. Conversation Flow
- [ ] New conversation starts successfully
- [ ] User messages are saved
- [ ] AI responses are relevant
- [ ] Context is maintained across messages
- [ ] Intent classification works correctly
- [ ] Entity extraction is accurate

#### 3. Search Functionality
- [ ] Search by destination works
- [ ] Budget filtering works
- [ ] Date handling is correct
- [ ] Guest count is respected
- [ ] Results display properly

#### 4. Booking Flow
- [ ] Listing details load correctly
- [ ] Reviews display properly
- [ ] Fraud check runs automatically
- [ ] Price calculation is accurate
- [ ] Booking creation works
- [ ] Payment redirect functions
- [ ] Payment verification works
- [ ] Confirmation email sent

#### 5. Error Handling
- [ ] Invalid dates are caught
- [ ] Missing information prompts user
- [ ] API errors show friendly messages
- [ ] Rate limiting works (50 msgs/hour)
- [ ] Booking expiry works (15 minutes)

### Test Queries

```javascript
// Basic search
"Find me a place in Goa"
"I want to visit Mumbai for 3 days"
"Show me villas in Manali under 5000"

// With dates
"Book a room in Delhi next weekend"
"I need accommodation in Bangalore from May 20 to May 25"

// Complete query
"I want to go to Goa for 4 days with 3 friends under 6000 budget"

// Follow-up questions
"Show me details of the first one"
"How much will it cost?"
"What do the reviews say?"
"Is this property safe?"

// Booking
"Book this stay"
"Yes, proceed with payment"
"Confirm booking"
```

---

## 🔧 Troubleshooting

### Issue 1: Ollama Connection Error

**Error**: `Ollama service is not running`

**Solution**:
```bash
# Start Ollama
ollama serve

# Verify it's running
curl http://localhost:11434/api/tags
```

### Issue 2: Model Not Found

**Error**: `Model llama3:latest not found`

**Solution**:
```bash
# Pull the model
ollama pull llama3:latest

# Verify installation
ollama list
```

### Issue 3: Chat Widget Not Appearing

**Possible Causes**:
1. User not logged in (widget only shows for authenticated users)
2. CSS not loaded
3. JavaScript not loaded

**Solution**:
- Check browser console for errors
- Verify `/css/chatWidget.css` loads
- Verify `/js/chatWidget.js` loads
- Ensure user is logged in

### Issue 4: Rate Limit Exceeded

**Error**: `Too many messages from this user`

**Solution**:
- Wait 1 hour for rate limit reset
- Or increase `CHAT_RATE_LIMIT` in `.env`

### Issue 5: Booking Expired

**Error**: `Booking has expired`

**Solution**:
- Bookings expire after 15 minutes
- Create a new booking
- Or increase `BOOKING_EXPIRY_MINUTES` in `.env`

### Issue 6: Payment Redirect Fails

**Possible Causes**:
1. Invalid Stripe keys
2. Booking not found
3. Network error

**Solution**:
- Verify `STRIPE_SECRET_KEY` in `.env`
- Check Stripe dashboard for errors
- Ensure booking exists in database

---

## 🎯 Performance Optimization

### 1. Ollama Response Time
- **Average**: 2-5 seconds
- **Optimization**: Use GPU if available
- **Alternative**: Use smaller model (qwen3.5:4b - 3.4GB)

### 2. Database Queries
- Indexes added on frequently queried fields
- Lean queries used for better performance
- Pagination for large result sets

### 3. Caching Strategy
- Consider caching search results (5 minutes)
- Cache listing details (10 minutes)
- Cache reviews (30 minutes)

### 4. Rate Limiting
- 50 messages per hour per user
- Prevents abuse and reduces server load

---

## 🔐 Security Considerations

1. **Authentication**: All chat endpoints require login
2. **Input Sanitization**: XSS prevention in chat messages
3. **Rate Limiting**: Prevents spam and abuse
4. **Payment Security**: Stripe handles all card details
5. **Fraud Detection**: AI-powered safety checks
6. **Session Management**: Secure conversation sessions

---

## 📊 Monitoring & Analytics

### Key Metrics to Track

1. **Conversation Metrics**:
   - Total conversations started
   - Average messages per conversation
   - Conversation completion rate
   - Abandoned conversations

2. **Booking Metrics**:
   - Bookings initiated via chat
   - Booking completion rate
   - Average booking value
   - Payment success rate

3. **Performance Metrics**:
   - Average response time
   - Tool execution time
   - Error rate
   - Rate limit hits

4. **User Engagement**:
   - Daily active users
   - Messages per user
   - Most common intents
   - Popular destinations

---

## 🚀 Future Enhancements

1. **Multi-language Support**: Add support for Hindi, Spanish, etc.
2. **Voice Input**: Allow voice messages
3. **Image Recognition**: Upload property images for search
4. **Smart Recommendations**: ML-based personalization
5. **Group Bookings**: Handle multiple rooms/properties
6. **Calendar Integration**: Sync with Google Calendar
7. **Price Alerts**: Notify users of price drops
8. **Loyalty Program**: Reward frequent users

---

## 📞 Support

For issues or questions:
- Check this documentation first
- Review error logs in console
- Test with provided example queries
- Verify Ollama is running
- Check MongoDB connection

---

## 📄 License

This implementation is part of the Wanderlust project.

---

**Last Updated**: May 15, 2026
**Version**: 1.0.0
**Author**: Bob (AI Development Team)