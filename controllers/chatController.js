const Conversation = require('../models/conversation');
const ChatMessage = require('../models/chatMessage');
const ollamaService = require('../services/ollamaService');
const mcpToolService = require('../services/mcpToolService');
const intentClassifier = require('../utils/intentClassifier');
const entityExtractor = require('../utils/entityExtractor');
const { v4: uuidv4 } = require('uuid');

/**
 * Start a new conversation
 */
module.exports.startConversation = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        error: 'Please login to use the chat'
      });
    }

    const userId = req.user._id;
    const sessionId = uuidv4();

    // Create new conversation
    const conversation = new Conversation({
      user: userId,
      sessionId: sessionId,
      status: 'active'
    });

    await conversation.save();

    // Create welcome message
    const welcomeMessage = new ChatMessage({
      conversation: conversation._id,
      role: 'assistant',
      content: "Hello! 👋 I'm your Wanderlust travel assistant. I can help you find the perfect accommodation for your trip. Where would you like to go?",
      metadata: {
        intent: 'general_query'
      }
    });

    await welcomeMessage.save();

    conversation.messages.push(welcomeMessage._id);
    await conversation.save();

    res.json({
      success: true,
      conversationId: conversation._id.toString(),
      sessionId: sessionId,
      message: welcomeMessage.content
    });
  } catch (error) {
    console.error('Start conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start conversation'
    });
  }
};

/**
 * Send a message and get AI response
 */
module.exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, message } = req.body;
    const userId = req.user._id;

    if (!conversationId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Conversation ID and message are required'
      });
    }

    // Get conversation
    const conversation = await Conversation.findById(conversationId)
      .populate('messages');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // Verify user owns this conversation
    if (conversation.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to conversation'
      });
    }

    // Save user message
    const userMessage = new ChatMessage({
      conversation: conversationId,
      role: 'user',
      content: message
    });

    await userMessage.save();
    conversation.messages.push(userMessage._id);

    // Classify intent and extract entities
    const intent = intentClassifier.classify(message);
    const entities = entityExtractor.extract(message);

    // Update conversation context with extracted entities
    if (entities.destination) conversation.context.destination = entities.destination;
    if (entities.checkIn) conversation.context.checkIn = entities.checkIn;
    if (entities.checkOut) conversation.context.checkOut = entities.checkOut;
    if (entities.guests) conversation.context.guests = entities.guests;
    if (entities.budget) conversation.context.budget = entities.budget;
    if (entities.propertyType) conversation.context.propertyType = entities.propertyType;

    // Calculate checkout if we have checkin and days
    if (entities.checkIn && entities.days && !entities.checkOut) {
      conversation.context.checkOut = entityExtractor.calculateCheckOut(entities.checkIn, entities.days);
    }

    await conversation.save();

    // Process based on intent
    let aiResponse;
    let toolResults = null;

    switch (intent.intent) {
      case 'search_listings':
        aiResponse = await handleSearchIntent(conversation, entities, req);
        toolResults = aiResponse.listings;
        break;

      case 'get_details':
        aiResponse = await handleDetailsIntent(conversation, message, req);
        break;

      case 'book_stay':
        aiResponse = await handleBookingIntent(conversation, userId, req);
        break;

      case 'get_reviews':
        aiResponse = await handleReviewsIntent(conversation, req);
        break;

      case 'price_inquiry':
        aiResponse = await handlePriceIntent(conversation, req);
        break;

      default:
        aiResponse = await handleGeneralQuery(conversation, message);
        break;
    }

    // Save assistant message
    const assistantMessage = new ChatMessage({
      conversation: conversationId,
      role: 'assistant',
      content: aiResponse.response,
      metadata: {
        intent: intent.intent,
        entities: entities,
        confidence: intent.confidence,
        listingCards: aiResponse.listingIds || []
      }
    });

    await assistantMessage.save();
    conversation.messages.push(assistantMessage._id);
    await conversation.save();

    res.json({
      success: true,
      response: aiResponse.response,
      listings: toolResults,
      intent: intent.intent,
      entities: entities,
      paymentUrl: aiResponse.paymentUrl,
      conversationContext: conversation.context
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process message',
      message: 'Sorry, I encountered an error. Please try again.'
    });
  }
};

/**
 * Get conversation history
 */
module.exports.getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId)
      .populate('messages')
      .populate('context.selectedListing');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    if (conversation.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    res.json({
      success: true,
      conversation: conversation
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation'
    });
  }
};

/**
 * Get all user conversations
 */
module.exports.getUserConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({ user: userId })
      .sort({ lastActivity: -1 })
      .limit(20)
      .select('sessionId status context lastActivity createdAt');

    res.json({
      success: true,
      conversations: conversations
    });
  } catch (error) {
    console.error('Get user conversations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations'
    });
  }
};

// ============= Intent Handlers =============

/**
 * Handle search listings intent
 */
async function handleSearchIntent(conversation, entities, req) {
  const context = conversation.context;

  // Merge entities with context (context takes precedence if entity is null)
  const destination = entities.destination || context.destination;
  const checkIn = entities.checkIn || context.checkIn;
  const checkOut = entities.checkOut || context.checkOut;
  const guests = entities.guests || context.guests;
  const budget = entities.budget || context.budget;

  // Debug logging
  console.log('🔍 Search Intent Debug:');
  console.log('  Entities:', JSON.stringify(entities));
  console.log('  Context:', JSON.stringify(context));
  console.log('  Merged - destination:', destination, 'budget:', budget, 'checkIn:', checkIn, 'guests:', guests);

  // Check if we have minimum required info
  if (!destination) {
    return {
      response: "I'd love to help you find a place! Where would you like to go? 🌍"
    };
  }

  // If user has destination AND budget, do a quick availability check
  // This handles queries like "Are there any listings in Pune under 1K?"
  if (destination && budget && !checkIn && !guests) {
    console.log('✅ Triggering availability check!');
    const searchParams = {
      destination: destination,
      budget: budget,
      category: entities.category || context.category
    };

    const result = await mcpToolService.searchListings(searchParams);

    if (result.success && result.count > 0) {
      const listingIds = result.listings.map(l => l._id);
      
      let response = `Yes! I found ${result.count} ${result.count === 1 ? 'property' : 'properties'} in ${destination} within ₹${budget.toLocaleString()}/night! 🏠\n\n`;
      response += `Would you like to see them? If yes, please tell me your check-in date and number of guests to show you the best options.`;
      
      return {
        response: response,
        listings: result.listings,
        listingIds: listingIds
      };
    } else {
      return {
        response: `Sorry, I couldn't find any properties in ${destination} within ₹${budget.toLocaleString()}/night. 😔\n\nWould you like to:\n• Increase your budget?\n• Try a different location?\n• See what's available without budget restrictions?`
      };
    }
  }

  // Build a list of what we have and what we need
  const hasCheckIn = !!checkIn;
  const hasGuests = guests !== null && guests !== undefined;
  
  // Ask for missing information only if we don't have it
  const missingInfo = [];
  if (!hasCheckIn) missingInfo.push('check-in date');
  if (!hasGuests) missingInfo.push('number of guests');

  if (missingInfo.length > 0) {
    // Build a friendly response acknowledging what we have
    let response = `Great! I'm looking for places in ${destination}`;
    
    if (hasCheckIn) {
      response += ` for ${checkIn}`;
    }
    if (hasGuests) {
      response += ` for ${guests} ${guests === 1 ? 'guest' : 'guests'}`;
    }
    if (budget) {
      response += ` within ₹${budget.toLocaleString()} per night`;
    }
    
    response += `. To complete the search, could you please provide your ${missingInfo.join(' and ')}?`;
    
    return { response };
  }

  // We have enough info, search listings
  const searchParams = {
    destination: destination,
    checkIn: checkIn,
    checkOut: checkOut,
    guests: guests || 1,
    budget: budget,
    category: entities.category || context.category
  };

  const result = await mcpToolService.searchListings(searchParams);

  if (result.success && result.count > 0) {
    const listingIds = result.listings.map(l => l._id);
    
    let response = `Perfect! I found ${result.count} amazing ${result.count === 1 ? 'property' : 'properties'} in ${searchParams.destination}`;
    
    if (searchParams.checkIn) {
      response += ` for ${searchParams.checkIn}`;
    }
    if (searchParams.guests) {
      response += ` for ${searchParams.guests} ${searchParams.guests === 1 ? 'guest' : 'guests'}`;
    }
    if (searchParams.budget) {
      response += ` within your budget of ₹${searchParams.budget.toLocaleString()}/night`;
    }
    
    response += `! 🏠 Check them out below. Let me know if you'd like details about any of them.`;
    
    return {
      response: response,
      listings: result.listings,
      listingIds: listingIds
    };
  } else {
    return {
      response: `I couldn't find any properties matching your criteria in ${searchParams.destination}. Would you like to try a different location or adjust your preferences? 🤔`
    };
  }
}

/**
 * Handle get details intent
 */
async function handleDetailsIntent(conversation, message, req) {
  // Try to extract listing ID from message or context
  const listingIdMatch = message.match(/[0-9a-f]{24}/i);
  
  if (!listingIdMatch && !conversation.context.selectedListing) {
    return {
      response: "Which property would you like to know more about? You can say 'show me details of the first one' or click on a property card."
    };
  }

  const listingId = listingIdMatch ? listingIdMatch[0] : conversation.context.selectedListing;

  // Get listing details
  const detailsResult = await mcpToolService.getListingDetails(listingId);
  
  if (!detailsResult.success) {
    return {
      response: "Sorry, I couldn't find that property. Could you try selecting another one?"
    };
  }

  // Get reviews
  const reviewsResult = await mcpToolService.getListingReviews({ listingId, limit: 3 });

  // Run fraud check
  const fraudResult = await mcpToolService.detectFraudListing(listingId);

  // Update context
  conversation.context.selectedListing = listingId;
  await conversation.save();

  const listing = detailsResult.listing;
  let response = `📍 **${listing.title}**\n\n`;
  response += `Location: ${listing.location}, ${listing.country}\n`;
  response += `Price: ₹${listing.price}/night\n`;
  response += `Rating: ${detailsResult.rating}⭐ (${detailsResult.reviewCount} reviews)\n\n`;
  
  if (listing.description) {
    response += `${listing.description.substring(0, 200)}...\n\n`;
  }

  response += `Safety Check: ${fraudResult.recommendation}\n\n`;
  
  if (reviewsResult.success && reviewsResult.reviews.length > 0) {
    response += `Recent Reviews:\n`;
    reviewsResult.reviews.slice(0, 2).forEach(review => {
      response += `• "${review.comment}" - ${review.author.username}\n`;
    });
  }

  response += `\nWould you like to book this property? 🏡`;

  return { response };
}

/**
 * Handle booking intent
 */
async function handleBookingIntent(conversation, userId, req) {
  const context = conversation.context;

  if (!context.selectedListing) {
    return {
      response: "Please select a property first before booking. Would you like me to search for properties?"
    };
  }

  // Check if we have all required info
  if (!context.checkIn || !context.checkOut || !context.guests) {
    return {
      response: "To proceed with booking, I need your check-in date, check-out date, and number of guests. Could you provide these details?"
    };
  }

  // Calculate price
  const priceResult = await mcpToolService.calculateBookingPrice({
    listingId: context.selectedListing,
    checkIn: context.checkIn,
    checkOut: context.checkOut,
    guests: context.guests
  });

  if (!priceResult.success) {
    return {
      response: "Sorry, I couldn't calculate the booking price. Please try again."
    };
  }

  // Create booking
  const bookingResult = await mcpToolService.createBooking({
    listingId: context.selectedListing,
    checkIn: context.checkIn,
    checkOut: context.checkOut,
    guests: context.guests,
    amount: priceResult.total,
    conversationId: conversation._id
  }, userId);

  if (!bookingResult.success) {
    return {
      response: "Sorry, I couldn't create the booking. Please try again."
    };
  }

  // Initiate payment
  const paymentResult = await mcpToolService.initiatePayment(bookingResult.bookingId, req);

  if (!paymentResult.success) {
    return {
      response: "Sorry, I couldn't initiate payment. Please try again."
    };
  }

  conversation.context.currentStep = 'payment';
  conversation.status = 'booking_in_progress';
  await conversation.save();

  return {
    response: `Perfect! Your booking is ready. 🎉\n\n**Booking Summary:**\n- Property: ${priceResult.listingTitle}\n- Check-in: ${context.checkIn}\n- Check-out: ${context.checkOut}\n- Guests: ${context.guests}\n- Total: ₹${priceResult.total}\n\nRedirecting you to secure payment... 🔒`,
    paymentUrl: paymentResult.paymentUrl
  };
}

/**
 * Handle reviews intent
 */
async function handleReviewsIntent(conversation, req) {
  if (!conversation.context.selectedListing) {
    return {
      response: "Which property would you like to see reviews for? Please select a property first."
    };
  }

  const reviewsResult = await mcpToolService.getListingReviews({
    listingId: conversation.context.selectedListing,
    limit: 5
  });

  if (!reviewsResult.success || reviewsResult.totalReviews === 0) {
    return {
      response: "This property doesn't have any reviews yet. It's a new listing!"
    };
  }

  let response = `📝 **Reviews for this property**\n\n`;
  response += `Average Rating: ${reviewsResult.averageRating}⭐ (${reviewsResult.totalReviews} reviews)\n\n`;
  
  response += `Rating Breakdown:\n`;
  response += `5⭐: ${reviewsResult.ratingBreakdown[5]} reviews\n`;
  response += `4⭐: ${reviewsResult.ratingBreakdown[4]} reviews\n`;
  response += `3⭐: ${reviewsResult.ratingBreakdown[3]} reviews\n\n`;

  response += `Recent Reviews:\n`;
  reviewsResult.reviews.forEach((review, idx) => {
    response += `${idx + 1}. ${review.rating}⭐ - "${review.comment}" - ${review.author.username}\n`;
  });

  return { response };
}

/**
 * Handle price inquiry intent
 */
async function handlePriceIntent(conversation, req) {
  const context = conversation.context;

  if (!context.selectedListing) {
    return {
      response: "Which property would you like to know the price for? Please select a property first."
    };
  }

  if (!context.checkIn || !context.checkOut) {
    return {
      response: "To calculate the total price, I need your check-in and check-out dates. When are you planning to stay?"
    };
  }

  const priceResult = await mcpToolService.calculateBookingPrice({
    listingId: context.selectedListing,
    checkIn: context.checkIn,
    checkOut: context.checkOut,
    guests: context.guests || 1
  });

  if (!priceResult.success) {
    return {
      response: "Sorry, I couldn't calculate the price. Please try again."
    };
  }

  let response = `💰 **Price Breakdown**\n\n`;
  response += `Base Price: ₹${priceResult.basePrice} × ${priceResult.nights} nights = ₹${priceResult.subtotal}\n`;
  response += `Service Fee (10%): ₹${priceResult.serviceFee}\n`;
  response += `Taxes (5%): ₹${priceResult.taxes}\n`;
  response += `**Total: ₹${priceResult.total}**\n\n`;
  response += `Would you like to proceed with booking? 🏡`;

  return { response };
}

/**
 * Handle general queries
 */
async function handleGeneralQuery(conversation, message) {
  const lowerMessage = message.toLowerCase();
  const context = conversation.context;

  // Check if user is providing information in a conversational way
  const hasContext = context.destination || context.checkIn || context.guests || context.budget;

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    if (hasContext) {
      // User already has context, acknowledge and continue
      let response = "Hello again! 👋 ";
      if (context.destination) {
        response += `I see you're interested in ${context.destination}. `;
      }
      response += "How can I help you further?";
      return { response };
    }
    return {
      response: "Hello! 👋 I'm here to help you find and book the perfect accommodation. Where would you like to go?"
    };
  }

  if (lowerMessage.includes('help')) {
    return {
      response: "I can help you:\n• Search for accommodations\n• Get property details\n• Check reviews and ratings\n• Calculate booking prices\n• Book your stay\n\nJust tell me where you'd like to go and I'll take care of the rest! 🌟"
    };
  }

  if (lowerMessage.includes('thank')) {
    return {
      response: "You're welcome! 😊 Is there anything else I can help you with?"
    };
  }

  // If user has provided some context, acknowledge it
  if (hasContext) {
    let response = "I understand you're interested in ";
    const parts = [];
    
    if (context.destination) parts.push(`traveling to ${context.destination}`);
    if (context.checkIn) parts.push(`checking in on ${context.checkIn}`);
    if (context.guests) parts.push(`${context.guests} ${context.guests === 1 ? 'guest' : 'guests'}`);
    if (context.budget) parts.push(`budget of ₹${context.budget.toLocaleString()}/night`);
    
    response += parts.join(', ') + ". ";
    
    // Suggest next steps based on what's missing
    const missingInfo = [];
    if (!context.destination) missingInfo.push('destination');
    if (!context.checkIn) missingInfo.push('check-in date');
    if (!context.guests) missingInfo.push('number of guests');
    
    if (missingInfo.length > 0) {
      response += `To search for properties, I'll need your ${missingInfo.join(' and ')}. Could you provide ${missingInfo.length === 1 ? 'that' : 'those'}?`;
    } else {
      response += "Would you like me to search for available properties?";
    }
    
    return { response };
  }

  return {
    response: "I'm here to help you find and book accommodations. You can tell me where you'd like to go, and I'll show you available properties. What destination are you interested in? 🗺️"
  };
}

// Made with Bob
