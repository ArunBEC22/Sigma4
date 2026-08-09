# Admin Dashboard - Quick Start Guide

## 🚀 Getting Started in 3 Steps

### Step 1: Create Admin User
Run this command in your terminal:
```bash
node scripts/createAdmin.js
```

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`
- Email: `admin@wanderlust.com`

⚠️ **Important**: Change the password after first login!

### Step 2: Start the Application
```bash
npm start
```

### Step 3: Login to Admin Dashboard
Open your browser and navigate to:
```
http://localhost:3000/admin/login
```

Login with the admin credentials from Step 1.

---

## 📊 Admin Dashboard Features

### 1. Dashboard Home (`/admin/dashboard`)
- View key metrics: Total bookings, revenue, listings, users
- See today's activity and recent bookings
- Quick action buttons

### 2. Bookings Management (`/admin/bookings`)
- View all bookings with advanced filters
- Search by user, email, or booking ID
- Filter by status, listing, and date range
- Export bookings to CSV
- View detailed booking information

### 3. Listings Management (`/admin/listings`)
- View all listings with performance metrics
- Add new listings (only admins can do this)
- Edit any listing
- Delete listings
- See booking count and revenue per listing

### 4. Analytics (`/admin/analytics`)
- Booking trends chart (line chart)
- Revenue trends chart (bar chart)
- Status distribution (pie chart)
- Bookings by category (bar chart)
- Top performing listings table
- Time range filters (7 days, 30 days, 3 months, 1 year)

### 5. Users Management (`/admin/users`)
- View all registered users
- See user statistics (bookings, spending)
- Identify admin vs regular users

### 6. Calendar View (`/admin/calendar`)
- Visual calendar of all bookings
- Color-coded by status
- Click events for details
- Month, week, and list views

---

## 🔐 Access Control

### Regular Users CAN:
- ✅ Browse listings
- ✅ Book listings
- ✅ View their own bookings
- ✅ Leave reviews
- ✅ Use chat support

### Regular Users CANNOT:
- ❌ Create new listings
- ❌ Edit any listings
- ❌ Delete listings
- ❌ Access admin dashboard
- ❌ View other users' bookings

### Admin Users CAN:
- ✅ Everything regular users can do
- ✅ Create, edit, delete ANY listing
- ✅ View ALL bookings
- ✅ Access analytics dashboard
- ✅ Manage users
- ✅ Export data
- ✅ Update booking status

---

## 🎨 Navigation

### Admin Sidebar Menu:
1. **Dashboard** - Overview and metrics
2. **Bookings** - Manage all bookings
3. **Listings** - Manage all listings
4. **Analytics** - View charts and reports
5. **Users** - User management
6. **Calendar** - Visual booking calendar
7. **View Main Site** - Go to public site
8. **Logout** - Sign out

---

## 📈 Key Metrics Explained

### Dashboard Metrics:
- **Total Bookings**: All bookings ever made
- **Total Revenue**: Sum of all confirmed bookings
- **Active Listings**: Total number of listings
- **Registered Users**: Total user accounts

### Booking Status:
- 🟢 **Confirmed**: Payment successful, booking active
- 🟡 **Pending Payment**: Awaiting payment completion
- 🔴 **Cancelled**: Booking cancelled by user/admin
- ⚫ **Payment Failed**: Payment attempt failed

---

## 💡 Common Tasks

### Add a New Listing
1. Go to **Listings** in sidebar
2. Click **Add New Listing** button
3. Fill in all required fields
4. Upload image
5. Submit

### View Booking Details
1. Go to **Bookings** in sidebar
2. Find the booking (use filters/search)
3. Click the eye icon (👁️)
4. View full details and update status if needed

### Export Bookings Data
1. Go to **Bookings** in sidebar
2. Apply filters if needed
3. Click **Export to CSV** button
4. File downloads automatically

### Check Analytics
1. Go to **Analytics** in sidebar
2. Select time range (7 days, 30 days, etc.)
3. View charts and top listings
4. Use insights for business decisions

---

## 🔧 Troubleshooting

### Can't Login to Admin Dashboard
- Make sure you're using `/admin/login` (not `/login`)
- Verify username and password
- Check that user has `role: 'admin'` in database

### Don't See Admin Menu
- Confirm you logged in at `/admin/login`
- Check browser console for errors
- Try clearing cache and cookies

### Charts Not Showing
- Ensure internet connection (uses CDN for Chart.js)
- Check browser console for errors
- Verify bookings exist in database

### Calendar Not Loading
- Ensure internet connection (uses CDN for FullCalendar)
- Check `/admin/api/calendar-data` endpoint
- Verify bookings have valid dates

---

## 📞 Need Help?

Refer to the comprehensive guide: `ADMIN_DASHBOARD_GUIDE.md`

---

## 🎯 Best Practices

1. **Regular Monitoring**: Check dashboard daily
2. **Handle Pending Payments**: Review and follow up
3. **Keep Listings Updated**: Maintain accurate information
4. **Analyze Trends**: Use analytics for decisions
5. **Secure Credentials**: Change default password
6. **Backup Data**: Export bookings regularly
7. **Monitor Users**: Track user activity

---

## ✨ Tips

- Use filters to find specific bookings quickly
- Export data before making bulk changes
- Check analytics weekly for trends
- Use calendar view for visual planning
- Update booking status promptly
- Keep listing information current

---

**Happy Managing! 🎉**