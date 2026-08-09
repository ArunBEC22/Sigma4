# Pro Subscription Expiry System - Testing Guide

## What Was Fixed

### Issues Resolved:
1. ✅ **Missing `checkAndDowngradeExpired` function** - Added function to check individual user subscriptions
2. ✅ **EJS template error** - Removed `require()` from EJS, moved logic to middleware
3. ✅ **Subscription data not available in templates** - Added `isExpiringSoon` and `daysUntilExpiry` to `res.locals`

### Files Modified:
- `utils/subscriptionChecker.js` - Added `checkAndDowngradeExpired()` function and exported it
- `app.js` - Added subscription helper data to `res.locals` for all templates
- `views/partials/proUpgradeBanner.ejs` - Removed `require()`, now uses data from `res.locals`
- `middleware/subscriptionMiddleware.js` - Created middleware to auto-check subscriptions
- `scripts/subscription-cron.js` - Created cron job script for batch processing
- `public/css/style.css` - Added Pro banner styles with expiry warning animation

## How It Works

### 1. Real-Time Subscription Check (Every Request)
```
User visits any page
    ↓
Middleware runs: checkSubscriptionStatus
    ↓
Checks if user's Pro subscription expired
    ↓
If expired: Downgrade to free + show flash message
    ↓
Continue to page
```

### 2. Expiry Warning Banner (7 Days Before)
```
User has Pro subscription expiring in 5 days
    ↓
Middleware calculates: isExpiringSoon = true, daysUntilExpiry = 5
    ↓
Banner shows: "⚠️ Pro Expiring Soon! Your Pro subscription expires in 5 days"
    ↓
User can click "Renew Pro" to extend
```

### 3. Daily Cron Job (Batch Processing)
```
Cron runs at midnight
    ↓
Finds all users with expired Pro subscriptions
    ↓
Downgrades each to free tier
    ↓
Logs results
```

## Testing Instructions

### Test 1: Start Application (No Errors)
```bash
cd /Users/arunrh/Desktop/Sigma4
node app.js
```

**Expected Output:**
```
app listening on port 3000
connected to db
```

**No errors about:**
- ❌ `subscriptionChecker.checkAndDowngradeExpired is not a function`
- ❌ `require is not defined`

### Test 2: Free User Sees Upgrade Banner
1. Login as a free user
2. Visit any page (e.g., `/listings`)
3. **Expected:** See purple upgrade banner at top:
   ```
   ⭐ Upgrade to Pro
   Unlock AI Booking Assistant & Real-time Activity Feed
   [Upgrade Now - $9.99/mo]
   ```

### Test 3: Pro User with Valid Subscription
1. Upgrade a user to Pro (or use existing Pro user)
2. Login and visit any page
3. **Expected:** 
   - ✅ No upgrade banner
   - ✅ Chatbot widget visible (bottom-right)
   - ✅ Activity feed visible (above chatbot)

### Test 4: Pro User Expiring Soon (Warning Banner)
**Setup:**
```javascript
// In MongoDB or using Mongo shell
db.users.updateOne(
  { email: "test@example.com" },
  { 
    $set: { 
      subscription: "pro",
      subscriptionExpiry: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
    }
  }
)
```

**Test:**
1. Login as the user
2. Visit any page
3. **Expected:** See pink/red warning banner:
   ```
   ⚠️ Pro Expiring Soon!
   Your Pro subscription expires in 5 days. Renew now to keep your premium features.
   [Renew Pro - $9.99/mo]
   ```
4. Warning icon should pulse (animation)

### Test 5: Expired Subscription (Auto-Downgrade)
**Setup:**
```javascript
// Set expiry to past date
db.users.updateOne(
  { email: "test@example.com" },
  { 
    $set: { 
      subscription: "pro",
      subscriptionExpiry: new Date("2024-01-01") // Past date
    }
  }
)
```

**Test:**
1. Login as the user
2. Visit any page
3. **Expected:**
   - ✅ Flash message: "⚠️ Your Pro subscription has expired. Upgrade again to access premium features."
   - ✅ User downgraded to free tier
   - ✅ Chatbot and activity feed no longer visible
   - ✅ Upgrade banner appears
   - ✅ Console log: `⬇️ Downgraded user [username] to free tier (expired)`

### Test 6: Payment Flow (Stripe Integration)
**Use Stripe Test Card:**
- Card: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/25`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

**Test:**
1. Login as free user
2. Click "Upgrade Now" on banner
3. Click "Get Pro Now" on upgrade page
4. Enter test card details on Stripe
5. Complete payment
6. **Expected:**
   - ✅ Redirected to `/listings`
   - ✅ Flash message: "🎉 Welcome to Pro! Your subscription is active until [date]"
   - ✅ Chatbot and activity feed now visible
   - ✅ Upgrade banner disappears
   - ✅ User subscription set to 'pro' with expiry 1 month from now

### Test 7: Payment Cancellation
1. Login as free user
2. Click "Upgrade Now"
3. Click "Get Pro Now"
4. Click "Back" or close Stripe checkout
5. **Expected:**
   - ✅ Redirected to `/subscription/upgrade`
   - ✅ Flash message: "Subscription upgrade was cancelled."
   - ✅ User remains on free tier

### Test 8: Cron Job (Manual Run)
```bash
node scripts/subscription-cron.js
```

**Expected Output:**
```
🔍 Checking for expired Pro subscriptions...
✅ Connected to database
⚠️  Found 2 expired subscription(s)
   ↓ Downgraded: user1@example.com (expired on Fri Jan 01 2024)
   ↓ Downgraded: user2@example.com (expired on Sat Jan 02 2024)
✅ Successfully downgraded 2 user(s) to free tier
✅ Database connection closed
✅ Subscription check completed successfully
```

### Test 9: Multiple Users Simultaneously
1. Create 3 users:
   - User A: Free tier
   - User B: Pro (valid, expires in 10 days)
   - User C: Pro (expired yesterday)

2. Login as each user in different browsers/incognito

3. **Expected:**
   - User A: Sees upgrade banner, no Pro features
   - User B: No banner, has Pro features
   - User C: Sees expiry flash message, downgraded to free, sees upgrade banner

### Test 10: Banner Styling and Responsiveness
1. View on desktop (wide screen)
2. View on mobile (narrow screen)
3. **Expected:**
   - Desktop: Banner content in single row
   - Mobile: Banner content stacks vertically
   - Button full-width on mobile
   - Smooth animations (slide down, pulse)

## Verification Checklist

After all tests, verify:

- [ ] Application starts without errors
- [ ] Free users see upgrade banner
- [ ] Pro users don't see upgrade banner
- [ ] Pro users expiring soon see warning banner
- [ ] Expired subscriptions auto-downgrade on page visit
- [ ] Flash messages show for subscription events
- [ ] Stripe payment flow works end-to-end
- [ ] Payment cancellation handled gracefully
- [ ] Cron job successfully downgrades expired users
- [ ] Pro features (chatbot, activity feed) only accessible to Pro users
- [ ] Banner styling looks good on desktop and mobile
- [ ] Console logs show subscription status changes

## Common Issues & Solutions

### Issue: "checkAndDowngradeExpired is not a function"
**Solution:** Ensure `utils/subscriptionChecker.js` exports the function:
```javascript
module.exports = {
    checkAndDowngradeExpired,  // ← Must be here
    checkExpiredSubscriptions,
    isExpiringSoon,
    getDaysUntilExpiry
};
```

### Issue: "require is not defined" in EJS
**Solution:** Don't use `require()` in EJS templates. Pass data via `res.locals` in middleware.

### Issue: Banner not showing
**Solution:** Check that `proUpgradeBanner.ejs` is included in `boilerplate.ejs` and CSS is loaded.

### Issue: Subscription not downgrading
**Solution:** 
1. Check middleware is registered in `app.js` before routes
2. Verify `isPro()` method checks expiry date
3. Check database connection

### Issue: Cron job not running
**Solution:**
1. Verify cron syntax: `crontab -l`
2. Check cron logs: `tail -f /var/log/subscription-cron.log`
3. Test manually: `node scripts/subscription-cron.js`

## Production Deployment

### 1. Environment Variables
Ensure `.env` has:
```env
MONGO_URL=mongodb+srv://...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
SECRET=your_session_secret
```

### 2. Setup Cron Job

**Linux/Mac:**
```bash
crontab -e
# Add:
0 0 * * * cd /path/to/Sigma4 && node scripts/subscription-cron.js >> /var/log/subscription-cron.log 2>&1
```

**Heroku:**
```bash
heroku addons:create scheduler:standard
heroku addons:open scheduler
# Add job: node scripts/subscription-cron.js
# Frequency: Daily
```

### 3. Monitor Logs
```bash
# Application logs
tail -f /var/log/app.log

# Cron logs
tail -f /var/log/subscription-cron.log
```

### 4. Database Indexes
Ensure indexes for performance:
```javascript
db.users.createIndex({ subscription: 1, subscriptionExpiry: 1 })
```

## Support & Maintenance

### Daily Tasks:
- Check cron job ran successfully
- Monitor subscription metrics in admin dashboard
- Review payment logs in Stripe dashboard

### Weekly Tasks:
- Analyze subscription conversion rates
- Check for failed payments
- Review user feedback on Pro features

### Monthly Tasks:
- Calculate monthly recurring revenue (MRR)
- Analyze churn rate
- Plan feature improvements

---

**Made with Bob** 🤖