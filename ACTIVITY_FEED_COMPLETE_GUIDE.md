# Activity Feed - Complete Guide

## Overview
The Recent Activity feed shows real-time activities (bookings, reviews, searches) to create social proof and build trust with users.

## What Gets Logged

### ✅ Activities That ARE Logged:

1. **Bookings** 🏠
   - Triggered: When payment is successful
   - Location: `controllers/paymentController.js` line 99
   - Shows: "User just booked 'Listing Title'"

2. **Reviews** ⭐
   - Triggered: When a review is created
   - Location: `controllers/reviews.js` line 16
   - Shows: "User left a 5-star review for 'Listing Title'"

3. **Searches** 🔍
   - Triggered: When users search for listings
   - Shows: "User searched in [location]"

4. **Views** 👀
   - Triggered: When users view a listing
   - Shows: "User is viewing 'Listing Title'"

## Activity Lifecycle

### Creation
- Activities are created automatically when actions occur
- Anonymous names are generated (e.g., "Rahul K.", "Priya S.")
- Activities include: type, username, listing info, timestamp

### Display
- Frontend fetches activities every 30 seconds
- Shows 10 most recent activities
- Activities are sorted by creation time (newest first)

### Deletion
- **Auto-deletion**: Activities older than 7 days are automatically deleted (TTL index)
- **Manual deletion**: When a review is deleted, its activity is also removed
- **Booking deletion**: Booking activities remain even if booking is cancelled

## Review Activity Behavior

### When Review is Created:
1. Review is saved to database
2. Activity is logged with anonymous username
3. Trust score is recalculated
4. Activity appears in feed within 30 seconds

### When Review is Deleted:
1. Review is removed from database
2. **Associated activity is also deleted** ✅ (NEW FIX)
3. Trust score is recalculated
4. Activity disappears from feed on next refresh

## Booking Activity Behavior

### When Booking is Completed:
1. Payment is processed via Stripe
2. Booking is saved to database
3. Confirmation email is sent
4. **Activity is logged** ✅
5. Trust score is updated
6. Activity appears in feed within 30 seconds

### When Booking is Cancelled:
- Activity remains in feed (not deleted)
- This is intentional to maintain social proof

## Technical Details

### Activity Model
```javascript
{
  type: 'booking' | 'review' | 'view' | 'search',
  userName: 'Anonymous Name',
  listing: ObjectId,
  listingTitle: 'Listing Title',
  location: 'Location',
  rating: Number (for reviews),
  metadata: Object,
  createdAt: Date
}
```

### TTL Index
- Activities expire after 7 days (604800 seconds)
- Configured in `models/activity.js` line 42
- MongoDB automatically deletes expired documents

### Frontend Refresh
- Auto-refresh: Every 30 seconds
- Manual refresh: Click the activity widget
- Notification popup: Shows new activities

## Common Issues & Solutions

### Issue 1: Review not showing in activity feed
**Causes:**
- Activity is older than 7 days (auto-deleted)
- Too many other activities (pushed out of top 10)
- Frontend not refreshing

**Solutions:**
- Create a new review to test
- Check browser console for errors
- Verify `/api/activity/recent` response

### Issue 2: Deleted review still showing
**Status:** ✅ FIXED
- Now when you delete a review, the activity is also removed
- Trust score is recalculated

### Issue 3: Booking not showing
**Check:**
- Payment must be successful (not just initiated)
- Activity is logged in `paymentSuccess` handler
- Check server logs for confirmation

## API Endpoints

### Get Recent Activities
```
GET /api/activity/recent?limit=10
```
Returns: Array of formatted activities

### Get Listing Social Proof
```
GET /api/activity/listing/:id/social-proof
```
Returns: Social proof data for specific listing

### Get Activity Stats (Admin)
```
GET /api/activity/stats
```
Returns: Activity statistics for dashboard

## Testing

### Test Review Activity:
1. Create a review on any listing
2. Check server console for: `✅ Logged review activity for [listing]`
3. Wait 30 seconds or refresh page
4. Check activity feed widget
5. Delete the review
6. Verify activity is removed from feed

### Test Booking Activity:
1. Complete a booking with payment
2. Check server console for: `✅ Logged booking activity for [listing]`
3. Wait 30 seconds or refresh page
4. Check activity feed widget

### Verify Database:
Run: `node check-review-activities.js`
This shows all activities in the database

## Configuration

### Change Activity Retention Period:
Edit `models/activity.js` line 42:
```javascript
// Current: 7 days
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

// Change to 30 days:
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });
```

### Change Activity Feed Limit:
Edit `public/js/activityFeed.js` line 287:
```javascript
// Current: 10 activities
const response = await fetch('/api/activity/recent?limit=10');

// Change to 20:
const response = await fetch('/api/activity/recent?limit=20');
```

### Change Auto-Refresh Interval:
Edit `public/js/activityFeed.js` line 10:
```javascript
// Current: 30 seconds
this.updateInterval = 30000;

// Change to 60 seconds:
this.updateInterval = 60000;
```

## Summary

✅ **Reviews**: Logged when created, removed when deleted
✅ **Bookings**: Logged when payment succeeds
✅ **Auto-cleanup**: Activities older than 7 days are deleted
✅ **Real-time**: Feed updates every 30 seconds
✅ **Anonymous**: User privacy protected with generated names
