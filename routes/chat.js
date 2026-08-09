const express = require('express');
const router = express.Router();
// Use AI-powered controller instead of rule-based
const chatController = require('../controllers/chatControllerAI');
const { isLoggedIn } = require('../middleware');

// Rate limiting middleware
const rateLimit = require('express-rate-limit');

const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.CHAT_RATE_LIMIT) || 50, // 50 messages per hour
  message: 'Too many messages from this user, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Initialize new conversation
router.post('/conversation/start', isLoggedIn, chatController.startConversation);

// Send message (with rate limiting)
router.post('/message', isLoggedIn, chatLimiter, chatController.sendMessage);

// Get conversation history
router.get('/conversation/:conversationId', isLoggedIn, chatController.getConversation);

// Get all user conversations
router.get('/conversations', isLoggedIn, chatController.getUserConversations);

module.exports = router;

// Made with Bob
