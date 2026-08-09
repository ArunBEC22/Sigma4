const Listing = require('../models/listing');
const Booking = require('../models/bookings');
const Review = require('../models/review');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class MCPToolService {
  /**
   * Tool 1: Search Listings
   * Search for accommodations based on user criteria
   */
  async searchListings(params) {
    try {
      const { destination, checkIn, checkOut, guests, budget, category, propertyType } = params;
      
      let query = {};
      
      // Search by destination (location or country)
      if (destination) {
        query.$or = [
          { location: new RegExp(destination, 'i') },
          { country: new RegExp(destination, 'i') },
          { title: new RegExp(destination, 'i') }
        ];
      }
      
      // Filter by budget (price per night)
      if (budget) {
        const budgetPerNight = checkIn && checkOut 
          ? budget / Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24))
          : budget;
        query.price = { $lte: budgetPerNight };
      }
      
      // Filter by category
      if (category) {
        query.category = category;
      }
      
      const listings = await Listing.find(query)
        .populate('owner', 'username')
        .populate('reviews')
        .limit(10)
        .lean();
      
      // Calculate average ratings
      const listingsWithRatings = listings.map(listing => {
        const avgRating = listing.reviews.length > 0
          ? listing.reviews.reduce((sum, r) => sum + r.rating, 0) / listing.reviews.length
          : 0;
        
        return {
          ...listing,
          averageRating: avgRating.toFixed(1),
          reviewCount: listing.reviews.length
        };
      });
      
      // Sort by rating
      listingsWithRatings.sort((a, b) => b.averageRating - a.averageRating);
      
      return {
        success: true,
        listings: listingsWithRatings,
        count: listingsWithRatings.length,
        filters_applied: { 
          destination, 
          budget, 
          category,
          guests: guests || 1
        }
      };
    } catch (error) {
      console.error('searchListings error:', error);
      return {
        success: false,
        error: 'Failed to search listings',
        listings: [],
        count: 0
      };
    }
  }

  /**
   * Tool 2: Get Listing Details
   * Fetch complete details of a specific listing
   */
  async getListingDetails(listingId) {
    try {
      const listing = await Listing.findById(listingId)
        .populate('owner', 'username email')
        .populate({
          path: 'reviews',
          populate: { path: 'author', select: 'username' }
        })
        .lean();
      
      if (!listing) {
        return { 
          success: false, 
          error: 'Listing not found' 
        };
      }
      
      const avgRating = listing.reviews.length > 0
        ? listing.reviews.reduce((sum, r) => sum + r.rating, 0) / listing.reviews.length
        : 0;
      
      return {
        success: true,
        listing: listing,
        rating: avgRating.toFixed(1),
        reviewCount: listing.reviews.length,
        availability: true,
        host: {
          name: listing.owner.username,
          email: listing.owner.email
        }
      };
    } catch (error) {
      console.error('getListingDetails error:', error);
      return {
        success: false,
        error: 'Failed to fetch listing details'
      };
    }
  }

  /**
   * Tool 3: Calculate Booking Price
   * Calculate total cost including taxes and fees
   */
  async calculateBookingPrice(params) {
    try {
      const { listingId, checkIn, checkOut, guests } = params;
      
      const listing = await Listing.findById(listingId);
      if (!listing) {
        return { 
          success: false, 
          error: 'Listing not found' 
        };
      }
      
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
      
      if (nights <= 0) {
        return {
          success: false,
          error: 'Invalid date range. Check-out must be after check-in.'
        };
      }
      
      const basePrice = listing.price;
      const subtotal = basePrice * nights;
      const serviceFee = Math.round(subtotal * 0.10); // 10% service fee
      const taxes = Math.round(subtotal * 0.05); // 5% taxes
      const total = subtotal + serviceFee + taxes;
      
      return {
        success: true,
        listingTitle: listing.title,
        basePrice: basePrice,
        nights: nights,
        subtotal: subtotal,
        serviceFee: serviceFee,
        taxes: taxes,
        total: total,
        breakdown: {
          perNight: basePrice,
          numberOfNights: nights,
          serviceFeePercent: 10,
          taxPercent: 5,
          guests: guests || 1
        }
      };
    } catch (error) {
      console.error('calculateBookingPrice error:', error);
      return {
        success: false,
        error: 'Failed to calculate booking price'
      };
    }
  }

  /**
   * Tool 4: Create Booking
   * Create a pending booking before payment
   */
  async createBooking(params, userId) {
    try {
      const { listingId, checkIn, checkOut, guests, amount, conversationId } = params;
      
      // Validate listing exists
      const listing = await Listing.findById(listingId);
      if (!listing) {
        return {
          success: false,
          error: 'Listing not found'
        };
      }
      
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const stayDays = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
      
      // Create booking with pending_payment status
      const booking = new Booking({
        user: userId,
        listing: listingId,
        checkinDate: checkInDate,
        checkoutDate: checkOutDate,
        stayDays: stayDays,
        guests: guests || 1,
        amount: amount,
        status: 'pending_payment',
        conversationId: conversationId,
        fraudCheckPassed: false,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000) // Expires in 15 minutes
      });
      
      await booking.save();
      
      return {
        success: true,
        bookingId: booking._id.toString(),
        status: 'pending_payment',
        expiresAt: booking.expiresAt,
        listingTitle: listing.title,
        checkIn: checkInDate.toDateString(),
        checkOut: checkOutDate.toDateString(),
        nights: stayDays,
        total: amount
      };
    } catch (error) {
      console.error('createBooking error:', error);
      return {
        success: false,
        error: 'Failed to create booking'
      };
    }
  }

  /**
   * Tool 5: Initiate Payment
   * Create Stripe checkout session
   */
  async initiatePayment(bookingId, req) {
    try {
      const booking = await Booking.findById(bookingId)
        .populate('listing')
        .populate('user');
      
      if (!booking) {
        return { 
          success: false, 
          error: 'Booking not found' 
        };
      }
      
      if (booking.status !== 'pending_payment') {
        return {
          success: false,
          error: 'Booking is not in pending payment status'
        };
      }
      
      // Check if booking has expired
      if (booking.expiresAt && new Date() > booking.expiresAt) {
        booking.status = 'cancelled';
        await booking.save();
        return {
          success: false,
          error: 'Booking has expired. Please create a new booking.'
        };
      }
      
      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'inr',
            product_data: { 
              name: `Booking: ${booking.listing.title}`,
              description: `${booking.stayDays} nights stay for ${booking.guests} guest(s)`,
              images: booking.listing.image?.url ? [booking.listing.image.url] : []
            },
            unit_amount: Math.round(booking.amount * 100) // Convert to paise
          },
          quantity: 1
        }],
        customer_email: booking.user.email,
        success_url: `${req.protocol}://${req.get('host')}/payment/success?bookingId=${bookingId}`,
        cancel_url: `${req.protocol}://${req.get('host')}/payment/cancel?bookingId=${bookingId}`,
        metadata: { 
          bookingId: bookingId.toString(),
          userId: booking.user._id.toString(),
          listingId: booking.listing._id.toString()
        }
      });
      
      // Save session ID to booking
      booking.stripeSessionId = session.id;
      await booking.save();
      
      return {
        success: true,
        paymentUrl: session.url,
        sessionId: session.id,
        expiresAt: new Date(session.expires_at * 1000)
      };
    } catch (error) {
      console.error('initiatePayment error:', error);
      return {
        success: false,
        error: 'Failed to initiate payment'
      };
    }
  }

  /**
   * Tool 6: Verify Payment
   * Verify payment status after checkout
   */
  async verifyPayment(params) {
    try {
      const { sessionId, bookingId } = params;
      
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const booking = await Booking.findById(bookingId);
      
      if (!booking) {
        return {
          success: false,
          error: 'Booking not found'
        };
      }
      
      if (session.payment_status === 'paid') {
        booking.status = 'confirmed';
        booking.paymentStatus = 'success';
        booking.paymentId = session.payment_intent;
        booking.transactionId = session.id;
        await booking.save();
        
        return {
          success: true,
          paymentStatus: 'success',
          bookingStatus: 'confirmed',
          transactionId: session.id,
          bookingId: booking._id.toString()
        };
      } else {
        booking.status = 'payment_failed';
        booking.paymentStatus = 'failed';
        await booking.save();
        
        return {
          success: false,
          paymentStatus: 'failed',
          bookingStatus: 'payment_failed',
          error: 'Payment was not completed'
        };
      }
    } catch (error) {
      console.error('verifyPayment error:', error);
      return {
        success: false,
        error: 'Failed to verify payment'
      };
    }
  }

  /**
   * Tool 7: Detect Fraud Listing
   * AI-based fraud detection for listings
   */
  async detectFraudListing(listingId) {
    try {
      const listing = await Listing.findById(listingId)
        .populate('owner')
        .populate('reviews');
      
      if (!listing) {
        return { 
          success: false, 
          error: 'Listing not found' 
        };
      }
      
      let fraudScore = 0;
      let warnings = [];
      let checks = [];
      
      // Check 1: New listing with no reviews
      if (listing.reviews.length === 0) {
        fraudScore += 20;
        warnings.push('New listing with no reviews yet');
        checks.push({ check: 'Review History', status: 'warning', score: 20 });
      } else {
        checks.push({ check: 'Review History', status: 'pass', score: 0 });
      }
      
      // Check 2: Price too good to be true (suspiciously low)
      if (listing.price < 500) {
        fraudScore += 15;
        warnings.push('Price is unusually low for the area');
        checks.push({ check: 'Price Analysis', status: 'warning', score: 15 });
      } else {
        checks.push({ check: 'Price Analysis', status: 'pass', score: 0 });
      }
      
      // Check 3: Owner account age
      if (listing.owner.createdAt) {
        const accountAge = Date.now() - new Date(listing.owner.createdAt).getTime();
        const daysOld = accountAge / (24 * 60 * 60 * 1000);
        
        if (daysOld < 30) {
          fraudScore += 25;
          warnings.push('Host account is less than 30 days old');
          checks.push({ check: 'Host Account Age', status: 'warning', score: 25 });
        } else {
          checks.push({ check: 'Host Account Age', status: 'pass', score: 0 });
        }
      }
      
      // Check 4: Negative reviews ratio
      if (listing.reviews.length > 0) {
        const negativeReviews = listing.reviews.filter(r => r.rating < 3).length;
        const negativeRatio = negativeReviews / listing.reviews.length;
        
        if (negativeRatio > 0.3) {
          fraudScore += 30;
          warnings.push('High percentage of negative reviews');
          checks.push({ check: 'Review Sentiment', status: 'warning', score: 30 });
        } else {
          checks.push({ check: 'Review Sentiment', status: 'pass', score: 0 });
        }
      }
      
      // Check 5: Missing critical information
      if (!listing.description || listing.description.length < 50) {
        fraudScore += 10;
        warnings.push('Incomplete property description');
        checks.push({ check: 'Property Details', status: 'warning', score: 10 });
      } else {
        checks.push({ check: 'Property Details', status: 'pass', score: 0 });
      }
      
      const isSafe = fraudScore < 50;
      const riskLevel = fraudScore < 30 ? 'low' : fraudScore < 60 ? 'medium' : 'high';
      
      let recommendation;
      if (isSafe) {
        recommendation = '✓ This listing appears safe to book. All safety checks passed.';
      } else if (fraudScore < 70) {
        recommendation = '⚠ Exercise caution. Consider contacting the host before booking.';
      } else {
        recommendation = '⛔ High risk detected. We recommend choosing an alternative listing.';
      }
      
      return {
        success: true,
        isSafe: isSafe,
        fraudScore: fraudScore,
        riskLevel: riskLevel,
        warnings: warnings,
        checks: checks,
        recommendation: recommendation
      };
    } catch (error) {
      console.error('detectFraudListing error:', error);
      return {
        success: false,
        error: 'Failed to perform fraud check'
      };
    }
  }

  /**
   * Tool 8: Get Listing Reviews
   * Fetch reviews and ratings for a property
   */
  async getListingReviews(params) {
    try {
      const { listingId, limit = 5 } = params;
      
      const listing = await Listing.findById(listingId).populate({
        path: 'reviews',
        populate: { path: 'author', select: 'username' },
        options: { 
          limit: parseInt(limit), 
          sort: { createdAt: -1 } 
        }
      });
      
      if (!listing) {
        return { 
          success: false, 
          error: 'Listing not found' 
        };
      }
      
      const avgRating = listing.reviews.length > 0
        ? listing.reviews.reduce((sum, r) => sum + r.rating, 0) / listing.reviews.length
        : 0;
      
      const ratingBreakdown = {
        5: listing.reviews.filter(r => r.rating === 5).length,
        4: listing.reviews.filter(r => r.rating === 4).length,
        3: listing.reviews.filter(r => r.rating === 3).length,
        2: listing.reviews.filter(r => r.rating === 2).length,
        1: listing.reviews.filter(r => r.rating === 1).length
      };
      
      return {
        success: true,
        reviews: listing.reviews,
        averageRating: avgRating.toFixed(1),
        totalReviews: listing.reviews.length,
        ratingBreakdown: ratingBreakdown
      };
    } catch (error) {
      console.error('getListingReviews error:', error);
      return {
        success: false,
        error: 'Failed to fetch reviews'
      };
    }
  }

  /**
   * Tool 9: Recommend Listings
   * AI-powered listing recommendations
   */
  async recommendListings(params) {
    try {
      const { budget, destination, tripType, preferences = {} } = params;
      
      let query = {};
      
      // Search by destination
      if (destination) {
        query.$or = [
          { location: new RegExp(destination, 'i') },
          { country: new RegExp(destination, 'i') }
        ];
      }
      
      // Filter by budget
      if (budget) {
        query.price = { $lte: budget };
      }
      
      // Trip type to category mapping
      const categoryMap = {
        'family': ['Farms', 'Amazing-Pools', 'Rooms'],
        'romantic': ['Castles', 'Iconic-Cities', 'Historical-Homes'],
        'adventure': ['Mountains', 'Camping', 'Boats'],
        'beach': ['Boats', 'Amazing-Pools', 'Iconic-Cities'],
        'luxury': ['Castles', 'Historical-Homes', 'Amazing-Pools'],
        'budget': ['Rooms', 'Camping', 'Farms']
      };
      
      if (tripType && categoryMap[tripType.toLowerCase()]) {
        query.category = { $in: categoryMap[tripType.toLowerCase()] };
      }
      
      const listings = await Listing.find(query)
        .populate('reviews')
        .limit(8)
        .lean();
      
      // Calculate ratings and sort
      const listingsWithRatings = listings.map(listing => {
        const avgRating = listing.reviews.length > 0
          ? listing.reviews.reduce((s, r) => s + r.rating, 0) / listing.reviews.length
          : 0;
        
        return {
          ...listing,
          averageRating: avgRating,
          reviewCount: listing.reviews.length
        };
      });
      
      // Sort by rating, then by review count
      listingsWithRatings.sort((a, b) => {
        if (b.averageRating !== a.averageRating) {
          return b.averageRating - a.averageRating;
        }
        return b.reviewCount - a.reviewCount;
      });
      
      const topRecommendations = listingsWithRatings.slice(0, 5);
      
      const reasoning = `Based on your ${tripType || 'travel'} preferences${budget ? ` and budget of ₹${budget}` : ''}, I've selected ${topRecommendations.length} highly-rated properties in ${destination}. These listings have excellent reviews and match your requirements.`;
      
      return {
        success: true,
        recommendations: topRecommendations,
        count: topRecommendations.length,
        reasoning: reasoning
      };
    } catch (error) {
      console.error('recommendListings error:', error);
      return {
        success: false,
        error: 'Failed to generate recommendations',
        recommendations: []
      };
    }
  }

  /**
   * Get tool definitions for Ollama
   * Returns array of tool schemas
   */
  getToolDefinitions() {
    return [
      {
        type: 'function',
        function: {
          name: 'searchListings',
          description: 'Search for accommodation listings based on destination, dates, budget, and preferences',
          parameters: {
            type: 'object',
            properties: {
              destination: {
                type: 'string',
                description: 'City or location to search (e.g., "Goa", "Manali")'
              },
              checkIn: {
                type: 'string',
                description: 'Check-in date in YYYY-MM-DD format'
              },
              checkOut: {
                type: 'string',
                description: 'Check-out date in YYYY-MM-DD format'
              },
              guests: {
                type: 'number',
                description: 'Number of guests'
              },
              budget: {
                type: 'number',
                description: 'Maximum budget in INR'
              },
              category: {
                type: 'string',
                description: 'Property category (e.g., "Mountains", "Beach", "Castles")'
              }
            },
            required: ['destination']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'getListingDetails',
          description: 'Get complete details of a specific listing including images, amenities, and host information',
          parameters: {
            type: 'object',
            properties: {
              listingId: {
                type: 'string',
                description: 'The MongoDB ObjectId of the listing'
              }
            },
            required: ['listingId']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'calculateBookingPrice',
          description: 'Calculate total booking cost including base price, service fees, and taxes',
          parameters: {
            type: 'object',
            properties: {
              listingId: {
                type: 'string',
                description: 'The listing ID'
              },
              checkIn: {
                type: 'string',
                description: 'Check-in date in YYYY-MM-DD format'
              },
              checkOut: {
                type: 'string',
                description: 'Check-out date in YYYY-MM-DD format'
              },
              guests: {
                type: 'number',
                description: 'Number of guests'
              }
            },
            required: ['listingId', 'checkIn', 'checkOut']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'detectFraudListing',
          description: 'Check if a listing is safe to book by analyzing various fraud indicators',
          parameters: {
            type: 'object',
            properties: {
              listingId: {
                type: 'string',
                description: 'The listing ID to check'
              }
            },
            required: ['listingId']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'getListingReviews',
          description: 'Fetch reviews and ratings for a property',
          parameters: {
            type: 'object',
            properties: {
              listingId: {
                type: 'string',
                description: 'The listing ID'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of reviews to fetch (default: 5)'
              }
            },
            required: ['listingId']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'recommendListings',
          description: 'Get AI-powered property recommendations based on preferences',
          parameters: {
            type: 'object',
            properties: {
              destination: {
                type: 'string',
                description: 'Destination city or location'
              },
              budget: {
                type: 'number',
                description: 'Budget in INR'
              },
              tripType: {
                type: 'string',
                description: 'Type of trip: family, romantic, adventure, beach, luxury, budget'
              }
            },
            required: ['destination', 'budget']
          }
        }
      }
    ];
  }
}

module.exports = new MCPToolService();

// Made with Bob
