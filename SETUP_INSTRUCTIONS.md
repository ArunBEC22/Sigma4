# 🚀 Quick Setup Instructions

## Prerequisites Checklist

- [x] Node.js v20.18.0 installed
- [x] MongoDB running
- [x] Ollama installed with llama3:latest model
- [x] Stripe account configured

---

## Step-by-Step Setup

### 1. Install Required NPM Packages

```bash
npm install uuid express-rate-limit
```

### 2. Start Ollama Service

Open a new terminal and run:

```bash
ollama serve
```

**Keep this terminal running!** Ollama must be active for the chat to work.

### 3. Verify Ollama Model

```bash
ollama list
```

You should see `llama3:latest` in the list. If not:

```bash
ollama pull llama3:latest
```

### 4. Environment Variables

Your `.env` file should have these new variables:

```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3:latest
CHAT_RATE_LIMIT=50
BOOKING_EXPIRY_MINUTES=15
```

### 5. Start Your Application

```bash
node app.js
```

### 6. Test the Chat

1. Open browser: `http://localhost:3000`
2. **Login** (chat only works for authenticated users)
3. Look for the purple chat button in bottom-right corner
4. Click it to open the chat widget
5. Try: "I want to visit Goa for 3 days"

---

## 🎯 Quick Test Commands

### Test Ollama Connection
```bash
curl http://localhost:11434/api/tags
```

### Test Chat API (after login)
```bash
curl -X POST http://localhost:3000/chat/conversation/start \
  -H "Content-Type: application/json" \
  -b "your-session-cookie"
```

---

## 📁 New Files Created

### Models
- `models/conversation.js` - Conversation tracking
- `models/chatMessage.js` - Chat messages
- `models/bookings.js` - Enhanced with payment fields

### Services
- `services/ollamaService.js` - Ollama AI integration
- `services/mcpToolService.js` - 9 MCP tools

### Controllers
- `controllers/chatController.js` - Chat logic

### Routes
- `routes/chat.js` - Chat API endpoints

### Utils
- `utils/intentClassifier.js` - Intent detection
- `utils/entityExtractor.js` - Entity extraction

### Frontend
- `public/css/chatWidget.css` - Chat styles
- `public/js/chatWidget.js` - Chat functionality
- `views/partials/chatWidget.ejs` - Chat UI

### Documentation
- `AI_CHAT_DOCUMENTATION.md` - Complete docs
- `SETUP_INSTRUCTIONS.md` - This file

---

## 🔍 Troubleshooting

### Chat button not showing?
- Make sure you're logged in
- Check browser console for errors
- Verify `/css/chatWidget.css` loads

### "Ollama service not running" error?
```bash
# Start Ollama in a separate terminal
ollama serve
```

### Chat not responding?
- Check Ollama is running: `curl http://localhost:11434/api/tags`
- Check MongoDB connection
- Look at server logs for errors

### Rate limit error?
- Wait 1 hour or increase `CHAT_RATE_LIMIT` in `.env`

---

## 🎨 Chat Widget Features

✅ Floating button (bottom-right)
✅ Smooth open/close animation
✅ Typing indicator
✅ Message history
✅ Listing cards with images
✅ Mobile responsive
✅ Dark mode support
✅ Rate limiting (50 msgs/hour)

---

## 🧪 Test Queries

Try these in the chat:

```
"I want to visit Goa"
"Find me a villa in Manali for 4 days"
"Show me places under 5000 budget"
"I need accommodation for 3 people next weekend"
"Show me details of the first property"
"How much will it cost?"
"Book this stay"
```

---

## 📊 Expected Behavior

1. **First message**: AI greets and asks where you want to go
2. **Search query**: AI extracts details and searches listings
3. **Results**: Displays property cards with images
4. **Selection**: Click card or say "show me details"
5. **Details**: Shows property info, reviews, safety check
6. **Booking**: Calculates price, creates booking, redirects to payment
7. **Payment**: Stripe checkout → Success page → Email confirmation

---

## 🔐 Security Notes

- Chat requires authentication (login)
- Rate limited to 50 messages/hour
- Input sanitized to prevent XSS
- Bookings expire after 15 minutes
- Stripe handles all payment data
- Fraud detection runs automatically

---

## 📈 Performance

- **Ollama Response**: 2-5 seconds (depends on hardware)
- **Search Query**: < 1 second
- **Booking Creation**: < 500ms
- **Payment Redirect**: Instant

**Tip**: If Ollama is slow, consider using a smaller model like `qwen3.5:4b` (3.4GB)

---

## 🎯 Next Steps

1. ✅ Complete setup above
2. ✅ Test basic chat functionality
3. ✅ Try a complete booking flow
4. ✅ Review logs for any errors
5. ✅ Customize responses if needed
6. ✅ Add more test data to MongoDB

---

## 📞 Need Help?

1. Check `AI_CHAT_DOCUMENTATION.md` for detailed info
2. Review error messages in terminal
3. Test Ollama separately: `ollama run llama3:latest "Hello"`
4. Verify MongoDB connection
5. Check Stripe dashboard for payment issues

---

**Setup Time**: ~10 minutes
**First Test**: ~2 minutes
**Full Booking Flow**: ~5 minutes

Good luck! 🚀