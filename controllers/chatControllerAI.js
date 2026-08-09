const Conversation = require('../models/conversation');
const ChatMessage = require('../models/chatMessage');
const ollamaService = require('../services/ollamaService');
const mcpToolService = require('../services/mcpToolService');
const { v4: uuidv4 } = require('uuid');

/**
 * AI-Powered Chat Controller using Ollama
 * Handles intelligent conversations with natural language understanding
 */

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
      content: "Hello! 👋 I'm your Wanderlust AI travel assistant. I can help you find the perfect accommodation for your trip. Where would you like to go?",
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
 * Send a message and get AI response using Ollama
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

    // Get conversation with message history
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
    await conversation.save();

    // Build conversation history for Ollama
    const conversationHistory = buildConversationHistory(conversation);

    // Call Ollama with system prompt and conversation history
    const systemPrompt = buildSystemPrompt(conversation.context);
    
    const ollamaMessages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Get AI response
    const aiResponse = await ollamaService.generateResponse(ollamaMessages);

    if (!aiResponse.success) {
      throw new Error('Failed to get AI response');
    }

    let aiContent = aiResponse.message.content;

    // Check for confirmation/booking keywords FIRST (before extraction)
    const confirmationKeywords = ['yes', 'confirm', 'proceed', 'book it', 'book now', 'sure', 'okay', 'ok', 'yeah', 'payment'];
    const bookingKeywords = ['book', 'booking', 'reserve', 'reservation'];
    const lowerMessage = message.toLowerCase();
    const hasConfirmKeyword = confirmationKeywords.some(keyword => lowerMessage.includes(keyword));
    const hasBookingKeyword = bookingKeywords.some(keyword => lowerMessage.includes(keyword));
    const hasSelectedListing = !!conversation.context.selectedListing;
    const hasBookingPrice = !!conversation.context.bookingPrice;
    const isConfirmation = hasConfirmKeyword && hasSelectedListing && hasBookingPrice;
    const isBookingIntent = hasConfirmKeyword || hasBookingKeyword;
    
    console.log('Intent check:', {
      message: message,
      hasConfirmKeyword,
      hasBookingKeyword,
      hasSelectedListing,
      hasBookingPrice,
      isConfirmation,
      isBookingIntent,
      selectedListing: conversation.context.selectedListing,
      bookingPrice: conversation.context.bookingPrice
    });

    // Extract structured data from user message (skip if confirming with complete info)
    let extractedData = {};
    if (!isConfirmation) {
      extractedData = await extractTravelData(aiContent, message);
      
      // Check if user is trying to book but we need to ask for listing selection first
      if (isBookingIntent && !hasSelectedListing && conversation.context.lastSearchResults && conversation.context.lastSearchResults.length > 0) {
        console.log('⚠️ User wants to book but no listing selected. Asking for selection...');
        extractedData.needsListingSelection = true;
      }
      
      // Update conversation context with extracted data
      if (extractedData.destination) conversation.context.destination = extractedData.destination;
      if (extractedData.checkIn) {
        // Ensure proper date format
        const checkInDate = new Date(extractedData.checkIn);
        if (!isNaN(checkInDate.getTime())) {
          conversation.context.checkIn = checkInDate.toISOString().split('T')[0];
          
          // Calculate checkOut if days provided but checkOut not provided
          if (extractedData.days && !extractedData.checkOut) {
            const checkOutDate = new Date(checkInDate);
            checkOutDate.setDate(checkOutDate.getDate() + parseInt(extractedData.days));
            conversation.context.checkOut = checkOutDate.toISOString().split('T')[0];
          }
        }
      }
      if (extractedData.checkOut) {
        const checkOutDate = new Date(extractedData.checkOut);
        if (!isNaN(checkOutDate.getTime())) {
          conversation.context.checkOut = checkOutDate.toISOString().split('T')[0];
        }
      }
      if (extractedData.guests) conversation.context.guests = extractedData.guests;
      if (extractedData.budget) conversation.context.budget = extractedData.budget;

      await conversation.save();
    }

    // Determine if we should search for listings
    let listings = null;
    console.log('🔍 Checking if should search listings...');
    console.log('  Context:', JSON.stringify(conversation.context));
    console.log('  Extracted:', JSON.stringify(extractedData));
    console.log('  isBookingIntent:', isBookingIntent);
    console.log('  hasLastSearchResults:', !!(conversation.context.lastSearchResults && conversation.context.lastSearchResults.length > 0));
    
    // Skip searching if user is trying to book and we already have search results
    const hasExistingResults = conversation.context.lastSearchResults && conversation.context.lastSearchResults.length > 0;
    const shouldSkipSearch = isBookingIntent && hasExistingResults;
    
    if (shouldSkipSearch) {
      console.log('⏭️  Skipping search - user wants to book existing results');
    } else if (shouldSearchListings(conversation.context, extractedData)) {
      console.log('✅ Should search! Searching now...');
      
      const searchResult = await mcpToolService.searchListings({
        destination: conversation.context.destination,
        checkIn: conversation.context.checkIn,
        checkOut: conversation.context.checkOut,
        guests: conversation.context.guests || 1,
        budget: conversation.context.budget
      });

      console.log('📊 Search result:', {
        success: searchResult.success,
        count: searchResult.count,
        hasListings: !!searchResult.listings
      });

      if (searchResult.success && searchResult.count > 0) {
        listings = searchResult.listings;
        console.log('✅ Found listings! Count:', listings.length);
        
        // Simple acknowledgment - let frontend display the cards
        aiContent = `Great! I found ${searchResult.count} ${searchResult.count === 1 ? 'property' : 'properties'} in ${conversation.context.destination} that match your requirements. Take a look at the options below and let me know if you'd like more details about any of them! 🏠`;
      } else if (searchResult.success && searchResult.count === 0) {
        console.log('❌ No listings found');
        // No results - ask AI to suggest alternatives
        const noResultsPrompt = `No properties found in ${conversation.context.destination}. Suggest 3 alternative nearby destinations in India that might interest the traveler.`;
        const alternativesResponse = await ollamaService.generateResponse([
          { role: 'system', content: 'You are a helpful travel assistant. Suggest popular Indian destinations.' },
          { role: 'user', content: noResultsPrompt }
        ]);
        
        aiContent = alternativesResponse.message.content;
      }
    } else {
      console.log('❌ Should NOT search (missing required fields)');
    }

    // Handle booking intent when user says "yes" or "book" after seeing listings
    if (isBookingIntent && !isConfirmation) {
      console.log('🔔 Booking intent detected without confirmation');
      
      // Check if we have search results but no selected listing
      if (conversation.context.lastSearchResults && conversation.context.lastSearchResults.length > 0 && !hasSelectedListing) {
        console.log('📋 Have search results but no listing selected');
        
        if (conversation.context.lastSearchResults.length === 1) {
          // Only one listing - auto-select it
          const listing = conversation.context.lastSearchResults[0];
          console.log('✅ Auto-selecting single listing:', listing._id);
          
          // Check if we have required booking info
          // Note: checkOut is optional if we have checkIn + days (already calculated)
          const missingInfo = [];
          if (!conversation.context.checkIn) missingInfo.push('check-in date');
          if (!conversation.context.checkOut) missingInfo.push('check-out date (or number of days)');
          if (!conversation.context.guests) missingInfo.push('number of guests');
          
          if (missingInfo.length > 0) {
            console.log('❌ Missing booking info:', missingInfo);
            aiContent = `I'd be happy to help you book ${listing.title}! However, I need a few more details:\n\n`;
            missingInfo.forEach(info => {
              aiContent += `- ${info.charAt(0).toUpperCase() + info.slice(1)}\n`;
            });
            aiContent += `\nPlease provide these details so I can proceed with your booking.`;
          } else {
            // We have all info - calculate price and ask for confirmation
            console.log('✅ Have all booking info, calculating price...');
            const checkIn = new Date(conversation.context.checkIn);
            const checkOut = conversation.context.checkOut ? new Date(conversation.context.checkOut) : new Date(checkIn.getTime() + 86400000);
            
            const priceResult = await mcpToolService.calculateBookingPrice({
              listingId: listing._id,
              checkIn: conversation.context.checkIn,
              checkOut: checkOut.toISOString().split('T')[0],
              guests: conversation.context.guests
            });

            if (priceResult.success) {
              conversation.context.selectedListing = listing._id;
              conversation.context.bookingPrice = priceResult.total;
              await conversation.save();

              const checkInFormatted = typeof conversation.context.checkIn === 'string' ? conversation.context.checkIn : new Date(conversation.context.checkIn).toISOString().split('T')[0];
              const checkOutFormatted = conversation.context.checkOut ? (typeof conversation.context.checkOut === 'string' ? conversation.context.checkOut : new Date(conversation.context.checkOut).toISOString().split('T')[0]) : checkOut.toISOString().split('T')[0];
              aiContent = `Perfect! Here's your booking summary for ${listing.title}:\n\n📅 Check-in: ${checkInFormatted}\n📅 Check-out: ${checkOutFormatted}\n👥 Guests: ${conversation.context.guests}\n💰 Total: ₹${priceResult.total.toLocaleString('en-IN')} (${priceResult.nights} ${priceResult.nights === 1 ? 'night' : 'nights'})\n\nWould you like to confirm this booking and proceed to payment?`;
            }
          }
        } else {
          // Multiple listings - ask user to select
          console.log('📋 Multiple listings, asking user to select');
          aiContent = `I found ${conversation.context.lastSearchResults.length} properties. Please click "View Details" on the property you'd like to book, or tell me which one interests you.`;
        }
      } else if (!conversation.context.lastSearchResults || conversation.context.lastSearchResults.length === 0) {
        // No search results - need to search first
        console.log('❌ No search results available');
        aiContent = `I'd be happy to help you book! First, could you tell me:\n\n- Where would you like to go?\n- When (check-in and check-out dates)?\n- How many guests?\n\nOnce I have these details, I can search for available properties.`;
      }
    }

    // Handle booking confirmation (when user confirms after seeing price)
    if (isConfirmation && conversation.context.selectedListing && conversation.context.bookingPrice) {
      // User confirmed booking - create booking and initiate payment
      const bookingResult = await mcpToolService.createBooking({
        listingId: conversation.context.selectedListing,
        checkIn: conversation.context.checkIn,
        checkOut: conversation.context.checkOut || new Date(new Date(conversation.context.checkIn).getTime() + 86400000).toISOString().split('T')[0],
        guests: conversation.context.guests,
        amount: conversation.context.bookingPrice,
        conversationId: conversationId
      }, req.user._id);

      if (bookingResult.success) {
        console.log('Booking created successfully:', bookingResult);
        
        // Initiate payment
        const paymentResult = await mcpToolService.initiatePayment(
          bookingResult.bookingId,
          req
        );
        
        console.log('Payment initiation result:', paymentResult);

        if (paymentResult.success) {
          aiContent = `Great! Your booking has been created. Redirecting you to secure payment...`;
          
          // Save assistant message
          const assistantMessage = new ChatMessage({
            conversation: conversationId,
            role: 'assistant',
            content: aiContent,
            metadata: {
              intent: 'booking_confirmed',
              entities: extractedData,
              aiGenerated: true
            }
          });

          await assistantMessage.save();
          conversation.messages.push(assistantMessage._id);
          await conversation.save();

          return res.json({
            success: true,
            response: aiContent,
            paymentUrl: paymentResult.paymentUrl,
            bookingId: bookingResult.bookingId
          });
        }
      }
      
      aiContent = `I'm sorry, there was an issue creating your booking. Please try again or contact support.`;
    }

    // Handle booking intent
    if (extractedData.intent === 'book_listing' || extractedData.intent === 'view_details') {
      // Try to find listing by name or ID
      let targetListing = null;
      
      if (extractedData.listingId) {
        const detailsResult = await mcpToolService.getListingDetails(extractedData.listingId);
        if (detailsResult.success) {
          targetListing = detailsResult.listing;
        }
      } else if (extractedData.listingName) {
        // Search by name
        const searchResult = await mcpToolService.searchListings({
          destination: conversation.context.destination || extractedData.listingName
        });
        
        if (searchResult.success && searchResult.count > 0) {
          // Find best match by name
          targetListing = searchResult.listings.find(l =>
            l.title.toLowerCase().includes(extractedData.listingName.toLowerCase())
          ) || searchResult.listings[0];
        }
      } else if (conversation.context.lastSearchResults && conversation.context.lastSearchResults.length > 0) {
        // Use first listing from last search
        targetListing = conversation.context.lastSearchResults[0];
      }

      if (targetListing) {
        if (extractedData.intent === 'view_details') {
          // Show listing details
          listings = [targetListing];
          aiContent = `Here are the details for ${targetListing.title}:\n\n📍 Location: ${targetListing.location}, ${targetListing.country}\n💰 Price: ₹${targetListing.price}/night\n⭐ Rating: ${targetListing.averageRating || 'New'}\n\nWould you like to proceed with booking this property?`;
        } else {
          // Booking intent
          if (!conversation.context.checkIn || !conversation.context.guests) {
            aiContent = `I'd be happy to help you book ${targetListing.title}! However, I need a few more details:\n\n`;
            if (!conversation.context.checkIn) aiContent += `- Check-in and check-out dates\n`;
            if (!conversation.context.guests) aiContent += `- Number of guests\n`;
            aiContent += `\nPlease provide these details so I can proceed with your booking.`;
          } else {
            // Calculate booking price
            const checkIn = new Date(conversation.context.checkIn);
            const checkOut = conversation.context.checkOut ? new Date(conversation.context.checkOut) : new Date(checkIn.getTime() + 86400000);
            const days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
            
            const priceResult = await mcpToolService.calculateBookingPrice({
              listingId: targetListing._id,
              checkIn: conversation.context.checkIn,
              checkOut: checkOut.toISOString().split('T')[0],
              guests: conversation.context.guests
            });

            if (priceResult.success) {
              console.log('Price calculation result:', priceResult);
              conversation.context.selectedListing = targetListing._id;
              conversation.context.bookingPrice = priceResult.total;
              console.log('Saving context:', {
                selectedListing: conversation.context.selectedListing,
                bookingPrice: conversation.context.bookingPrice
              });
              await conversation.save();
              console.log('Context saved successfully');

              const checkInFormatted = typeof conversation.context.checkIn === 'string' ? conversation.context.checkIn : new Date(conversation.context.checkIn).toISOString().split('T')[0];
              const checkOutFormatted = conversation.context.checkOut ? (typeof conversation.context.checkOut === 'string' ? conversation.context.checkOut : new Date(conversation.context.checkOut).toISOString().split('T')[0]) : checkOut.toISOString().split('T')[0];
              aiContent = `Perfect! Here's your booking summary for ${targetListing.title}:\n\n📅 Check-in: ${checkInFormatted}\n📅 Check-out: ${checkOutFormatted}\n👥 Guests: ${conversation.context.guests}\n💰 Total: ₹${priceResult.total.toLocaleString('en-IN')} (${priceResult.nights} ${priceResult.nights === 1 ? 'night' : 'nights'})\n\nWould you like to confirm this booking and proceed to payment?`;
            }
          }
        }
      } else {
        aiContent = `I couldn't find that specific property. Could you please:\n1. Select a property from the search results above, or\n2. Tell me the destination you'd like to visit so I can search for available properties?`;
      }
    }

    // Store last search results for context
    if (listings && listings.length > 0) {
      conversation.context.lastSearchResults = listings.map(l => ({
        _id: l._id,
        title: l.title,
        location: l.location,
        price: l.price
      }));
      await conversation.save();
    }

    // Save assistant message
    const assistantMessage = new ChatMessage({
      conversation: conversationId,
      role: 'assistant',
      content: aiContent,
      metadata: {
        intent: extractedData.intent || 'general_query',
        entities: extractedData,
        aiGenerated: true
      }
    });

    await assistantMessage.save();
    conversation.messages.push(assistantMessage._id);
    await conversation.save();

    console.log('📤 Sending response:', {
      success: true,
      hasResponse: !!aiContent,
      hasListings: !!listings,
      listingsCount: listings ? listings.length : 0
    });

    res.json({
      success: true,
      response: aiContent,
      listings: listings,
      conversationContext: conversation.context
    });

  } catch (error) {
    console.error('Send message error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      conversationId: req.body.conversationId,
      userMessage: req.body.message
    });
    
    // Check if Ollama is not running
    if (error.message.includes('Ollama service is not running')) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not available. Please start Ollama.',
        message: 'Sorry, the AI service is temporarily unavailable. Please try again later.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to process message',
      message: 'Sorry, I encountered an error. Please try again.'
    });
  }
};

/**
 * Build conversation history for Ollama
 */
function buildConversationHistory(conversation) {
  const history = [];
  
  // Get last 10 messages for context
  const recentMessages = conversation.messages.slice(-10);
  
  for (const msg of recentMessages) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      history.push({
        role: msg.role,
        content: msg.content
      });
    }
  }
  
  return history;
}

/**
 * Build system prompt with current context
 */
function buildSystemPrompt(context) {
  let prompt = `You are a helpful AI travel assistant for Wanderlust, an accommodation booking platform similar to Airbnb.

STRICT RULES - YOU MUST FOLLOW THESE:
1. ONLY answer questions about accommodation booking, travel, hotels, properties, and related topics
2. If asked about ANYTHING else (programming, math, science, general knowledge, etc.), politely decline and redirect to accommodation booking
3. DO NOT provide information on topics outside accommodation/travel domain
4. Response template for off-topic questions: "I'm a travel assistant specialized in accommodation booking. I can only help with finding and booking properties in India. Is there anything travel-related I can assist you with?"

Your role:
- Help users find accommodations in India
- Extract travel details: destination, dates, number of guests, budget
- Be friendly, concise, and helpful
- Handle typos and variations in city names (e.g., "manglore" → "Mangalore")
- When no results found, suggest 2-3 alternative nearby destinations

Current conversation context:`;

  if (context.destination) prompt += `\n- Destination: ${context.destination}`;
  if (context.checkIn) prompt += `\n- Check-in: ${context.checkIn}`;
  if (context.checkOut) prompt += `\n- Check-out: ${context.checkOut}`;
  if (context.guests) prompt += `\n- Guests: ${context.guests}`;
  if (context.budget) prompt += `\n- Budget: ₹${context.budget}`;

  prompt += `\n\nImportant:
- If user mentions a destination, acknowledge it and ask for missing details (dates, guests)
- If all details are provided, confirm you'll search for properties
- Be conversational and natural
- Keep responses under 100 words`;

  return prompt;
}

/**
 * Extract travel data from AI response and user message
 */
async function extractTravelData(aiResponse, userMessage) {
  const data = {};
  
  // Use a simple extraction prompt
  const extractionPrompt = `Extract travel booking details from this message: "${userMessage}"

Return ONLY a JSON object with these fields (use null if not found):
{
  "destination": "city name",
  "checkIn": "YYYY-MM-DD format",
  "checkOut": "YYYY-MM-DD format",
  "days": number of days/nights,
  "guests": number,
  "budget": number (extract from phrases like "under 100", "within 5000", "budget 1000"),
  "intent": "search_listings or book_listing or view_details or general_query",
  "listingId": "listing ID if mentioned",
  "listingName": "hotel/property name if mentioned"
}

Examples:
"I want to go to Goa for 3 days" → {"destination": "Goa", "checkIn": null, "checkOut": null, "days": 3, "guests": null, "budget": null, "intent": "search_listings", "listingId": null, "listingName": null}
"Any places in Pune under 100?" → {"destination": "Pune", "checkIn": null, "checkOut": null, "days": null, "guests": null, "budget": 100, "intent": "search_listings", "listingId": null, "listingName": null}
"Do you have listings in Mumbai under 5000?" → {"destination": "Mumbai", "checkIn": null, "checkOut": null, "days": null, "guests": null, "budget": 5000, "intent": "search_listings", "listingId": null, "listingName": null}
"trip of 4 days, check in on 20th May 2026, 4 people" → {"destination": null, "checkIn": "2026-05-20", "checkOut": "2026-05-24", "days": 4, "guests": 4, "budget": null, "intent": "search_listings", "listingId": null, "listingName": null}
"20th may 2026 and 4 people" → {"destination": null, "checkIn": "2026-05-20", "checkOut": null, "days": null, "guests": 4, "budget": null, "intent": "search_listings", "listingId": null, "listingName": null}
"book this" → {"destination": null, "checkIn": null, "checkOut": null, "days": null, "guests": null, "budget": null, "intent": "book_listing", "listingId": null, "listingName": null}
"book UK-27 hotel" → {"destination": null, "checkIn": null, "checkOut": null, "days": null, "guests": null, "budget": null, "intent": "book_listing", "listingId": null, "listingName": "UK-27"}
"Show me details of listing 123" → {"destination": null, "checkIn": null, "checkOut": null, "days": null, "guests": null, "budget": null, "intent": "view_details", "listingId": "123", "listingName": null}
"we will go to hubli then book" → {"destination": "Hubli", "checkIn": null, "checkOut": null, "days": null, "guests": null, "budget": null, "intent": "book_listing", "listingId": null, "listingName": null}`;

  try {
    const extractionResponse = await ollamaService.generateResponse([
      { role: 'system', content: 'You are a data extraction assistant. Return ONLY valid JSON, no other text.' },
      { role: 'user', content: extractionPrompt }
    ]);

    const jsonMatch = extractionResponse.message.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extracted = JSON.parse(jsonMatch[0]);
      return extracted;
    }
  } catch (error) {
    console.error('Extraction error:', error);
  }

  return data;
}

/**
 * Determine if we should search for listings
 */
function shouldSearchListings(context, extractedData) {
  // Search if we have destination and either dates, guests, OR budget (for availability queries)
  const hasDestination = context.destination || extractedData.destination;
  const hasBudget = context.budget || extractedData.budget;
  const hasDetails = context.checkIn || context.guests || extractedData.checkIn || extractedData.guests;
  
  // Allow search with just destination + budget (availability query)
  // OR destination + (dates or guests) (booking query)
  return hasDestination && (hasBudget || hasDetails);
}

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

// Made with Bob - AI-Powered Version