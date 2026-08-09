/**
 * Entity Extraction Utility
 * Extracts travel-related entities from user messages
 */

class EntityExtractor {
  constructor() {
    // Common Indian cities and tourist destinations
    this.destinations = [
      'goa', 'manali', 'shimla', 'delhi', 'mumbai', 'bangalore', 'chennai',
      'kolkata', 'jaipur', 'udaipur', 'kerala', 'kashmir', 'ladakh',
      'rishikesh', 'mussoorie', 'nainital', 'ooty', 'coorg', 'darjeeling',
      'andaman', 'lakshadweep', 'pondicherry', 'hampi', 'agra', 'varanasi',
      'belagavi', 'belgaum', 'pune', 'hyderabad', 'ahmedabad', 'surat',
      'lucknow', 'kanpur', 'nagpur', 'indore', 'bhopal', 'visakhapatnam',
      'patna', 'vadodara', 'ghaziabad', 'ludhiana', 'nashik', 'faridabad',
      'meerut', 'rajkot', 'kalyan', 'vasai', 'varanasi', 'srinagar',
      'aurangabad', 'dhanbad', 'amritsar', 'allahabad', 'ranchi', 'gwalior',
      'chandigarh', 'vijayawada', 'jodhpur', 'madurai', 'raipur', 'kota',
      'mysore', 'bhubaneswar', 'salem', 'warangal', 'mira', 'thiruvananthapuram',
      'bhiwandi', 'saharanpur', 'guntur', 'amravati', 'bikaner', 'noida',
      'jamshedpur', 'bhilai', 'cuttack', 'firozabad', 'kochi', 'bhavnagar',
      'dehradun', 'durgapur', 'asansol', 'nanded', 'kolhapur', 'ajmer',
      'gulbarga', 'jamnagar', 'ujjain', 'loni', 'siliguri', 'jhansi',
      'ulhasnagar', 'nellore', 'jammu', 'sangli', 'belgaum', 'mangalore',
      'ambattur', 'tirunelveli', 'malegaon', 'gaya', 'tiruppur', 'davanagere'
    ];

    // Regex patterns for entity extraction
    this.patterns = {
      // Destination patterns
      destination: [
        /(?:to|in|at|near|around)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
        /(?:visit|go to|going to|traveling to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:for|in)/
      ],
      
      // Days/nights patterns
      days: [
        /(\d+)\s*(?:days?|nights?)/i,
        /for\s+(\d+)\s*(?:days?|nights?)/i
      ],
      
      // Guests patterns
      guests: [
        /(\d+)\s*(?:people|guests?|persons?|friends?|adults?)/i,
        /with\s+(\d+)\s*(?:people|guests?|friends?)/i,
        /(?:party of|group of)\s+(\d+)/i
      ],
      
      // Budget patterns
      budget: [
        /(?:under|below|within|budget of|budget is|max|maximum)\s*(?:₹|Rs\.?|INR)?\s*(\d+(?:,\d+)*(?:k|K)?)/i,
        /(?:₹|Rs\.?|INR)\s*(\d+(?:,\d+)*(?:k|K)?)\s*(?:budget|max|maximum|per night)?/i,
        /budget\s+(?:is|of)?\s*(\d+(?:,\d+)*(?:k|K)?)/i,
        /\b(\d+(?:,\d+)*(?:k|K)?)\s*(?:rupees?|rs|inr|₹)/i
      ],
      
      // Date patterns
      dates: [
        // With keywords
        /(?:from|on|starting|check-in|checkin)\s+(\d{1,2}(?:st|nd|rd|th)?\s+\w+(?:\s+\d{4})?|\d{1,2}\/\d{1,2}\/\d{2,4})/i,
        // Without keywords - standalone dates
        /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4})\b/i,
        /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/,
        /\b(\d{4}-\d{2}-\d{2})\b/,
        // Relative dates
        /(?:next|this)\s+(weekend|week|month)/i
      ],
      
      // Property type patterns
      propertyType: [
        /(villa|apartment|house|room|cottage|bungalow|resort|hotel)/i
      ],
      
      // Category patterns
      category: [
        /(mountain|beach|castle|farm|camping|boat|pool|city|historical)/i
      ]
    };

    // Month names for date parsing
    this.months = {
      'january': 0, 'jan': 0,
      'february': 1, 'feb': 1,
      'march': 2, 'mar': 2,
      'april': 3, 'apr': 3,
      'may': 4,
      'june': 5, 'jun': 5,
      'july': 6, 'jul': 6,
      'august': 7, 'aug': 7,
      'september': 8, 'sep': 8, 'sept': 8,
      'october': 9, 'oct': 9,
      'november': 10, 'nov': 10,
      'december': 11, 'dec': 11
    };
  }

  /**
   * Extract all entities from message
   * @param {String} message - User message
   * @returns {Object} - Extracted entities
   */
  extract(message) {
    if (!message || typeof message !== 'string') {
      return {};
    }

    const entities = {};

    // Extract destination
    const destination = this.extractDestination(message);
    if (destination) entities.destination = destination;

    // Extract days
    const days = this.extractDays(message);
    if (days) entities.days = days;

    // Extract guests
    const guests = this.extractGuests(message);
    if (guests) entities.guests = guests;

    // Extract budget
    const budget = this.extractBudget(message);
    if (budget) entities.budget = budget;

    // Extract dates
    const dates = this.extractDates(message);
    if (dates.checkIn) entities.checkIn = dates.checkIn;
    if (dates.checkOut) entities.checkOut = dates.checkOut;

    // Extract property type
    const propertyType = this.extractPropertyType(message);
    if (propertyType) entities.propertyType = propertyType;

    // Extract category
    const category = this.extractCategory(message);
    if (category) entities.category = category;

    return entities;
  }

  /**
   * Extract destination from message
   */
  extractDestination(message) {
    // Check against known destinations first (case-insensitive)
    const lowerMessage = message.toLowerCase();
    for (const dest of this.destinations) {
      if (lowerMessage.includes(dest.toLowerCase())) {
        // Capitalize first letter of each word
        return dest.split(' ').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
      }
    }

    // Try pattern matching (case-insensitive)
    for (const pattern of this.patterns.destination) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Fallback: extract any capitalized word that might be a place name
    // This catches places not in our list
    const words = message.split(/\s+/);
    for (const word of words) {
      // Check if word starts with capital letter and is at least 3 chars
      if (word.length >= 3 && /^[A-Z][a-z]+/.test(word)) {
        // Skip common words that aren't places (including month names)
        const skipWords = ['I', 'The', 'A', 'An', 'My', 'Your', 'This', 'That', 'These', 'Those', 'Want', 'Need', 'Like', 'Love', 'Have', 'Can', 'Will', 'Would', 'Should', 'Could', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        if (!skipWords.includes(word)) {
          return word;
        }
      }
    }

    return null;
  }

  /**
   * Extract number of days
   */
  extractDays(message) {
    for (const pattern of this.patterns.days) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1]);
      }
    }
    return null;
  }

  /**
   * Extract number of guests
   */
  extractGuests(message) {
    for (const pattern of this.patterns.guests) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1]);
      }
    }
    return null;
  }

  /**
   * Extract budget
   */
  extractBudget(message) {
    for (const pattern of this.patterns.budget) {
      const match = message.match(pattern);
      if (match && match[1]) {
        let budget = match[1].replace(/,/g, '');
        
        // Handle 'k' or 'K' suffix (thousands)
        if (budget.toLowerCase().endsWith('k')) {
          budget = parseFloat(budget.slice(0, -1)) * 1000;
        } else {
          budget = parseFloat(budget);
        }
        
        return Math.round(budget);
      }
    }
    return null;
  }

  /**
   * Extract dates from message
   */
  extractDates(message) {
    const result = {};
    const lowerMessage = message.toLowerCase();

    // Handle relative dates
    if (lowerMessage.includes('next weekend')) {
      const today = new Date();
      const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7;
      const saturday = new Date(today);
      saturday.setDate(today.getDate() + daysUntilSaturday);
      
      const sunday = new Date(saturday);
      sunday.setDate(saturday.getDate() + 1);
      
      result.checkIn = this.formatDate(saturday);
      result.checkOut = this.formatDate(sunday);
      return result;
    }

    if (lowerMessage.includes('this weekend')) {
      const today = new Date();
      const daysUntilSaturday = (6 - today.getDay());
      
      if (daysUntilSaturday >= 0) {
        const saturday = new Date(today);
        saturday.setDate(today.getDate() + daysUntilSaturday);
        
        const sunday = new Date(saturday);
        sunday.setDate(saturday.getDate() + 1);
        
        result.checkIn = this.formatDate(saturday);
        result.checkOut = this.formatDate(sunday);
      }
      return result;
    }

    // Try to extract specific dates - collect all date matches
    const dateMatches = [];
    for (const pattern of this.patterns.dates) {
      const matches = message.matchAll(new RegExp(pattern.source, pattern.flags + 'g'));
      for (const match of matches) {
        if (match && match[1]) {
          const date = this.parseDate(match[1]);
          if (date && !isNaN(date.getTime())) {
            dateMatches.push(date);
          }
        }
      }
    }

    // If we found dates, use them
    if (dateMatches.length > 0) {
      // Sort dates chronologically
      dateMatches.sort((a, b) => a - b);
      
      // First date is check-in
      result.checkIn = this.formatDate(dateMatches[0]);
      
      // If there's a second date, it's check-out
      if (dateMatches.length > 1) {
        result.checkOut = this.formatDate(dateMatches[1]);
      }
    }

    return result;
  }

  /**
   * Parse date string to Date object
   */
  parseDate(dateStr) {
    // ISO format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(dateStr);
    }

    // DD/MM/YYYY or DD/MM/YY
    const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (slashMatch) {
      let year = parseInt(slashMatch[3]);
      if (year < 100) year += 2000;
      return new Date(year, parseInt(slashMatch[2]) - 1, parseInt(slashMatch[1]));
    }

    // "20th May 2026" or "15 May 2026" (with year)
    const textMatchWithYear = dateStr.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)\s+(\d{4})/i);
    if (textMatchWithYear) {
      const day = parseInt(textMatchWithYear[1]);
      const monthName = textMatchWithYear[2].toLowerCase();
      const year = parseInt(textMatchWithYear[3]);
      const month = this.months[monthName];
      
      if (month !== undefined) {
        return new Date(year, month, day);
      }
    }

    // "15th May" or "15 May" (without year - use current year)
    const textMatch = dateStr.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)/i);
    if (textMatch) {
      const day = parseInt(textMatch[1]);
      const monthName = textMatch[2].toLowerCase();
      const month = this.months[monthName];
      
      if (month !== undefined) {
        const year = new Date().getFullYear();
        return new Date(year, month, day);
      }
    }

    return null;
  }

  /**
   * Format date to YYYY-MM-DD
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Extract property type
   */
  extractPropertyType(message) {
    for (const pattern of this.patterns.propertyType) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].toLowerCase();
      }
    }
    return null;
  }

  /**
   * Extract category
   */
  extractCategory(message) {
    const categoryMap = {
      'mountain': 'Mountains',
      'mountains': 'Mountains',
      'beach': 'Amazing-Pools',
      'castle': 'Castles',
      'castles': 'Castles',
      'farm': 'Farms',
      'farms': 'Farms',
      'camping': 'Camping',
      'boat': 'Boats',
      'boats': 'Boats',
      'pool': 'Amazing-Pools',
      'pools': 'Amazing-Pools',
      'city': 'Iconic-Cities',
      'cities': 'Iconic-Cities',
      'historical': 'Historical-Homes',
      'historic': 'Historical-Homes'
    };

    for (const pattern of this.patterns.category) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const key = match[1].toLowerCase();
        return categoryMap[key] || null;
      }
    }
    return null;
  }

  /**
   * Calculate check-out date from check-in and days
   */
  calculateCheckOut(checkIn, days) {
    if (!checkIn || !days) return null;
    
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkInDate.getDate() + days);
    
    return this.formatDate(checkOutDate);
  }

  /**
   * Validate extracted entities
   */
  validate(entities) {
    const errors = [];

    // Validate dates
    if (entities.checkIn && entities.checkOut) {
      const checkIn = new Date(entities.checkIn);
      const checkOut = new Date(entities.checkOut);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (checkIn < today) {
        errors.push('Check-in date cannot be in the past');
      }

      if (checkOut <= checkIn) {
        errors.push('Check-out date must be after check-in date');
      }
    }

    // Validate guests
    if (entities.guests && (entities.guests < 1 || entities.guests > 20)) {
      errors.push('Number of guests must be between 1 and 20');
    }

    // Validate budget
    if (entities.budget && entities.budget < 0) {
      errors.push('Budget must be a positive number');
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
}

module.exports = new EntityExtractor();

// Made with Bob
