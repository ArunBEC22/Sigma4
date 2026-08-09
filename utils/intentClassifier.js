/**
 * Intent Classification Utility
 * Classifies user messages into predefined intents
 */

class IntentClassifier {
  constructor() {
    // Intent names must match MongoDB schema enum values (lowercase with underscores)
    this.intents = {
      search_listings: {
        keywords: [
          'find', 'search', 'looking for', 'want to go', 'visit', 'stay',
          'accommodation', 'hotel', 'villa', 'apartment', 'room',
          'book', 'reserve', 'need', 'show me', 'available', 'properties',
          'property', 'place', 'places', 'trip', 'travel', 'plan', 'go to',
          'going to', 'want to', 'need to', 'looking to'
        ],
        patterns: [
          /(?:find|search|looking for|show me).+(?:in|at|near|to)/i,
          /(?:want to|planning to|going to|need to).+(?:visit|go to|stay|go|trip|travel)/i,
          /(?:accommodation|place|stay|property|properties).+(?:in|at|near|to)/i,
          /(?:plan|planning).+(?:trip|travel|visit)/i,
          /(?:go|going).+(?:to|for)/i,
          /\b(?:goa|kashmir|manali|delhi|mumbai|bangalore|chennai|belagavi|bengaluru|pune|hyderabad)\b/i
        ],
        confidence_threshold: 0.3
      },
      get_details: {
        keywords: [
          'details', 'more info', 'tell me about', 'show me',
          'information', 'describe', 'what about', 'this one',
          'second', 'first', 'third', 'property'
        ],
        patterns: [
          /(?:tell me|show me|give me).+(?:details|info|about)/i,
          /(?:more|additional).+(?:information|details)/i,
          /(?:what|how).+(?:about|is)/i
        ],
        confidence_threshold: 0.7
      },
      book_stay: {
        keywords: [
          'book', 'reserve', 'confirm', 'proceed', 'yes',
          'booking', 'reservation', 'checkout', 'pay'
        ],
        patterns: [
          /(?:book|reserve|confirm).+(?:this|stay|booking)/i,
          /(?:proceed|go ahead).+(?:with|to).+(?:booking|payment)/i,
          /^(?:yes|ok|okay|sure|confirm)$/i
        ],
        confidence_threshold: 0.8
      },
      get_reviews: {
        keywords: [
          'reviews', 'ratings', 'feedback', 'comments',
          'what do people say', 'opinions', 'testimonials'
        ],
        patterns: [
          /(?:show|get|fetch).+(?:reviews|ratings|feedback)/i,
          /what.+(?:people say|guests think|reviews)/i
        ],
        confidence_threshold: 0.8
      },
      price_inquiry: {
        keywords: [
          'cost', 'price', 'how much', 'total', 'amount',
          'expensive', 'cheap', 'budget', 'charges', 'fees'
        ],
        patterns: [
          /how much.+(?:cost|price|total)/i,
          /what.+(?:price|cost|total)/i,
          /(?:total|final).+(?:amount|cost|price)/i
        ],
        confidence_threshold: 0.8
      },
      general_query: {
        keywords: [
          'hello', 'hi', 'hey', 'help', 'what', 'how',
          'can you', 'please', 'thank', 'thanks'
        ],
        patterns: [
          /^(?:hello|hi|hey|greetings)/i,
          /(?:help|assist|support)/i,
          /(?:thank|thanks)/i
        ],
        confidence_threshold: 0.5
      },
      cancellation: {
        keywords: [
          'cancel', 'stop', 'nevermind', 'forget it',
          'don\'t want', 'changed my mind', 'abort'
        ],
        patterns: [
          /(?:cancel|stop|abort).+(?:booking|reservation)/i,
          /(?:don't|do not).+(?:want|need)/i,
          /(?:changed|change).+mind/i
        ],
        confidence_threshold: 0.8
      }
    };
  }

  /**
   * Classify user message intent
   * @param {String} message - User message
   * @returns {Object} - Intent classification result
   */
  classify(message) {
    if (!message || typeof message !== 'string') {
      return {
        intent: 'general_query',
        confidence: 0.5,
        matches: []
      };
    }

    const lowerMessage = message.toLowerCase();
    
    // Quick check: if message contains travel-related words + destination, it's likely a search
    const travelWords = ['go', 'going', 'visit', 'trip', 'travel', 'plan', 'want', 'need', 'find', 'search', 'show', 'looking', 'check-in', 'check in', 'checkin', 'checkout', 'check-out', 'check out', 'people', 'guests', 'persons', 'adults', 'stay', 'staying', 'night', 'nights', 'day', 'days'];
    const cityNames = ['goa', 'kashmir', 'manali', 'delhi', 'mumbai', 'bangalore', 'chennai', 'belagavi', 'bengaluru', 'pune', 'hyderabad', 'shimla', 'kerala', 'ladakh', 'rishikesh', 'mussoorie', 'nainital', 'ooty', 'coorg', 'darjeeling', 'andaman', 'jaipur', 'udaipur', 'agra', 'varanasi'];
    
    const hasTravelWord = travelWords.some(word => lowerMessage.includes(word));
    const hasCity = cityNames.some(city => lowerMessage.includes(city));
    
    // Check for date patterns (indicates booking intent)
    const hasDate = /\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)/i.test(message) ||
                    /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(message) ||
                    /\d{4}-\d{2}-\d{2}/.test(message);
    
    // If message has travel intent words OR mentions a city OR has dates, classify as search
    if (hasTravelWord || hasCity || hasDate) {
      return {
        intent: 'search_listings',
        confidence: 0.8,
        matches: ['travel_context_detected']
      };
    }

    const results = [];

    // Check each intent
    for (const [intentName, intentData] of Object.entries(this.intents)) {
      let score = 0;
      let matches = [];

      // Check keywords
      for (const keyword of intentData.keywords) {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          score += 1;
          matches.push(keyword);
        }
      }

      // Check patterns
      for (const pattern of intentData.patterns) {
        if (pattern.test(message)) {
          score += 2; // Patterns have higher weight
          matches.push('pattern_match');
        }
      }

      // Calculate confidence
      const maxScore = intentData.keywords.length + (intentData.patterns.length * 2);
      const confidence = maxScore > 0 ? score / maxScore : 0;

      if (confidence >= intentData.confidence_threshold) {
        results.push({
          intent: intentName,
          confidence: confidence,
          matches: matches
        });
      }
    }

    // Sort by confidence
    results.sort((a, b) => b.confidence - a.confidence);

    // Return best match or default
    if (results.length > 0) {
      return results[0];
    }

    return {
      intent: 'general_query',
      confidence: 0.5,
      matches: []
    };
  }

  /**
   * Check if message contains booking confirmation
   * @param {String} message
   * @returns {Boolean}
   */
  isConfirmation(message) {
    const confirmationPatterns = [
      /^(?:yes|yeah|yep|sure|ok|okay|confirm|proceed|go ahead)$/i,
      /^(?:yes|yeah|yep|sure|ok|okay),?\s*(?:please|thanks)?$/i
    ];

    return confirmationPatterns.some(pattern => pattern.test(message.trim()));
  }

  /**
   * Check if message contains cancellation
   * @param {String} message
   * @returns {Boolean}
   */
  isCancellation(message) {
    const cancellationPatterns = [
      /^(?:no|nope|cancel|stop|nevermind|forget it)$/i,
      /(?:don't|do not|dont).+(?:want|need)/i,
      /(?:changed|change).+mind/i
    ];

    return cancellationPatterns.some(pattern => pattern.test(message.trim()));
  }
}

module.exports = new IntentClassifier();

// Made with Bob
