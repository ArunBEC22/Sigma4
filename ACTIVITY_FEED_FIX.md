# Activity Feed Fix & Testing Guide

## Issues Found & Fixed

### 1. **Field Name Mismatch in activityLogger.js** ✅ FIXED
**Problem**: The `logBooking` function was trying to access `booking.checkIn` and `booking.checkOut`, but the Booking model uses `checkinDate` and `checkoutDate`.

**Fix Applied**: Updated `utils/activityLogger.js` line 18-19 to use correct field names:
```javascript
checkIn: booking.checkinDate,
checkOut: booking.checkoutDate,
```

### 2. **Missing checkoutDate in Payment Controller** ✅ FIXED
**Problem**: The payment controller wasn't calculating and saving the checkout date when creating bookings.

**Fix Applied**: Updated `controllers/paymentController.js` to calculate checkout date:
```javascript
const checkin = new Date(checkInDate);
const checkout = new Date(checkin);
checkout.setDate(checkout.getDate() + parsedStayDays);

const booking = new Booking({
  user: userId,
  listing: listingId,
  checkinDate: checkin,
  checkoutDate: checkout,  // Now properly set
  stayDays: parsedStayDays,
  amount: totalAmount,
});
```

### 3. **Empty Database**
**Problem**: The debug script shows the database is completely empty (no bookings, reviews, or listings).

**Solution**: The user needs to:
1. Restart the server to apply the fixes
2. Create new bookings and reviews (old ones won't have activities logged)
3. Or use the test data script provided below

---

## How to Test the Activity Feed

### Option 1: Manual Testing (Recommended)
1. **Restart your server**:
   ```bash
   npm start
   ```

2. **Create test data through the UI**:
   - Login as admin and create some listings
   - Login as a regular user
   - Browse listings (this logs views)
   - Make a booking (this logs booking activity)
   - Leave a review (this logs review activity)

3. **Check the activity feed**:
   - The widget should appear in the bottom-right corner
   - Activities should update every 30 seconds
   - You should see "Someone just booked..." and "Someone just reviewed..." messages

### Option 2: Create Test Data via Script
Run the test data creation script:
```bash
node create-test-activities.js
```

This will create sample activities to verify the feed is working.

---

## Debugging Steps

### 1. Run the Debug Script
```bash
node test-activity-debug.js
```

This will show:
- Total activities in database
- Recent bookings and their status
- Recent reviews
- Listings with social proof data
- TTL index status

### 2. Check Server Logs
When you make a booking or leave a review, you should see console logs:
```
✅ Logged booking activity for [Listing Title]
✅ Logged review activity for [Listing Title]
```

If you don't see these logs, the activity logger isn't being called.

### 3. Check Browser Console
Open browser DevTools (F12) and check for:
- JavaScript errors in the console
- Network requests to `/api/activity/recent`
- Activity feed widget initialization messages

### 4. Test API Endpoint Directly
```bash
curl http://localhost:3000/api/activity/recent
```

Should return JSON array of activities.

---

## Common Issues & Solutions

### Issue: "No activities showing in feed"
**Causes**:
1. Database is empty (no bookings/reviews made yet)
2. Server not restarted after fixes
3. Activity logging failing silently

**Solutions**:
1. Make new bookings/reviews after restarting server
2. Check server logs for errors
3. Run debug script to verify database state

### Issue: "Activities created but not displaying"
**Causes**:
1. Frontend widget not loading
2. API endpoint not working
3. JavaScript errors in browser

**Solutions**:
1. Check browser console for errors
2. Verify `/api/activity/recent` returns data
3. Check if `activityFeed.js` is loaded in page source

### Issue: "Old bookings don't show activities"
**Explanation**: Activities are only logged when bookings/reviews are created. Old data won't have activities.

**Solution**: Create new bookings and reviews after the fix is applied.

---

## Verification Checklist

- [ ] Server restarted after applying fixes
- [ ] At least one listing exists in database
- [ ] Made a new booking (after restart)
- [ ] Left a new review (after restart)
- [ ] Checked server logs for "✅ Logged..." messages
- [ ] Ran `node test-activity-debug.js` to verify activities exist
- [ ] Checked browser console for errors
- [ ] Activity feed widget visible in bottom-right corner
- [ ] Activities display in the feed

---

## Technical Details

### Activity Logging Flow

1. **Booking Flow**:
   ```
   User completes payment
   → paymentSuccess() in paymentController.js
   → activityLogger.logBooking(booking, listing)
   → Activity document created in MongoDB
   → Listing stats updated (bookingCount, weeklyBookings, lastBookedAt)
   → Trust score calculated
   ```

2. **Review Flow**:
   ```
   User submits review
   → createReview() in reviews.js
   → activityLogger.logReview(review, listing)
   → Activity document created in MongoDB
   → Trust score recalculated
   ```

3. **View Flow**:
   ```
   User views listing
   → showListing() in listings.js
   → activityLogger.logView(listingId)
   → Listing viewCount incremented
   → currentViewers incremented (decrements after 5 min)
   ```

### Activity Feed Widget

- **Location**: Bottom-right corner of all pages
- **Update Frequency**: Every 30 seconds
- **Display Duration**: 5 seconds per activity
- **Auto-hide**: After 10 seconds of no new activities
- **Data Source**: `/api/activity/recent` endpoint

### Database Schema

**Activity Collection**:
```javascript
{
  type: 'booking' | 'review' | 'view' | 'search',
  userName: 'Rahul K.',  // Anonymous name
  listing: ObjectId,
  listingTitle: 'Cozy Beach House',
  location: 'Goa',
  rating: 5,  // Only for reviews
  metadata: { checkIn, checkOut, amount },
  createdAt: Date,
  updatedAt: Date
}
```

**TTL Index**: Activities auto-delete after 7 days (604800 seconds)

---

## Next Steps

1. **Restart your server** to apply the fixes
2. **Create new test data** (bookings and reviews)
3. **Run the debug script** to verify activities are being created
4. **Check the activity feed** in your browser

If issues persist after following these steps, check:
- Server logs for errors
- Browser console for JavaScript errors
- Database connection is working
- All files are saved and server restarted

---

## Files Modified

1. `utils/activityLogger.js` - Fixed field names (checkIn → checkinDate, checkOut → checkoutDate)
2. `controllers/paymentController.js` - Added checkout date calculation
3. `test-activity-debug.js` - Created comprehensive debug script
4. `create-test-activities.js` - Created test data generation script

---

**Status**: ✅ All fixes applied. Ready for testing.

**Last Updated**: 2026-05-16