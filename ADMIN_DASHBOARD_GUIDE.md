# Admin Dashboard Implementation Guide

## Overview
This document describes the complete admin dashboard system implemented for WanderLust. The system separates user and admin functionalities, ensuring that regular users can only browse and book listings, while admins have full control over the platform.

## Key Features

### 1. Role-Based Access Control
- **User Role**: Default role for all new registrations
  - Can browse listings
  - Can book listings
  - Can view their own bookings
  - Can leave reviews
  - **CANNOT** create, edit, or delete listings

- **Admin Role**: Special privileges
  - Full access to all listings management
  - View all bookings across all users
  - Access to analytics and reports
  - User management capabilities
  - Export data functionality

### 2. Admin Dashboard Components

#### Dashboard Home (`/admin/dashboard`)
- **Key Metrics Cards**:
  - Total Bookings (with confirmed count)
  - Total Revenue (with weekly revenue)
  - Active Listings count
  - Registered Users count
  
- **Today's Activity**:
  - New bookings today
  - Pending payments
  
- **Recent Bookings Table**:
  - Last 10 bookings with full details
  - Quick view and action buttons

#### Bookings Management (`/admin/bookings`)
- **Advanced Filters**:
  - Status filter (all, confirmed, pending, cancelled, failed)
  - Listing filter (dropdown of all listings)
  - Date range filter (start and end date)
  - Search by user name, email, or booking ID
  
- **Comprehensive Table**:
  - Booking ID, User, Listing, Dates, Duration, Guests, Amount, Status
  - Color-coded status badges
  - View details button for each booking
  
- **Export Functionality**:
  - Export filtered bookings to CSV
  
- **Summary Statistics**:
  - Total bookings count
  - Confirmed bookings
  - Pending bookings
  - Total revenue from filtered results

#### Booking Details (`/admin/bookings/:id`)
- **Full Booking Information**:
  - Booking ID and status
  - Check-in and check-out dates
  - Number of guests and duration
  - Payment details (amount, transaction ID, payment status)
  - Fraud check status and score
  - Creation and update timestamps
  
- **User Information Card**:
  - Username, email, role
  - Member since date
  - Link to view all users
  
- **Listing Information Card**:
  - Listing image
  - Title, location, country, category
  - Price per night
  - Link to view listing
  
- **Status Update Form**:
  - Change booking status (pending, confirmed, cancelled, failed)
  
- **Chat Integration**:
  - Link to conversation if available

#### Listings Management (`/admin/listings`)
- **Listings Table**:
  - Image thumbnail
  - Title, location, category
  - Price per night
  - Booking count and revenue
  - Average rating
  - Action buttons (view, edit, delete)
  
- **Quick Actions**:
  - Add new listing button
  - Edit any listing
  - Delete any listing (with confirmation)
  
- **Performance Metrics**:
  - Total listings
  - Total bookings across all listings
  - Total revenue
  - Average rating

#### Analytics Dashboard (`/admin/analytics`)
- **Time Range Filter**:
  - Last 7 days
  - Last 30 days
  - Last 3 months
  - Last year
  
- **Charts**:
  1. **Booking Trends** (Line Chart)
     - Daily booking counts over selected period
     
  2. **Revenue Trends** (Bar Chart)
     - Daily revenue over selected period
     
  3. **Booking Status Distribution** (Doughnut Chart)
     - Breakdown by status (confirmed, pending, cancelled, failed)
     
  4. **Bookings by Category** (Horizontal Bar Chart)
     - Bookings count per listing category
     
- **Top Performing Listings Table**:
  - Top 10 listings by booking count
  - Total bookings and revenue per listing
  - Average revenue per booking

#### Users Management (`/admin/users`)
- **Users Table**:
  - Avatar, username, email
  - Role badge (admin/user)
  - Total bookings count
  - Total amount spent
  - Member since date
  
- **Summary Statistics**:
  - Total users
  - Admin users count
  - Active users (with bookings)
  - Total revenue from all users

#### Booking Calendar (`/admin/calendar`)
- **Interactive Calendar**:
  - Month, week, and list views
  - Color-coded events by status
  - Click on event to view details in modal
  
- **Event Details Modal**:
  - Booking ID, status, dates
  - Guests and amount
  - Link to full booking details
  
- **Legend**:
  - Green: Confirmed
  - Yellow: Pending Payment
  - Red: Cancelled
  - Gray: Payment Failed

## Technical Implementation

### Database Schema Changes

#### User Model (`models/user.js`)
```javascript
{
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}
```

### Middleware (`middleware.js`)

#### isAdmin Middleware
```javascript
module.exports.isAdmin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.flash("error", "Please login as admin");
        return res.redirect("/admin/login");
    }
    if (req.user.role !== 'admin') {
        req.flash("error", "Access denied. Admin privileges required.");
        return res.redirect("/listings");
    }
    next();
};
```

### Routes Protection

#### Listing Routes (`routes/listing.js`)
- **Before**: Any logged-in user could create/edit/delete listings
- **After**: Only admins can create/edit/delete listings

```javascript
// Create listing - Admin only
router.post("/", isLoggedIn, isAdmin, upload.single(...), ...)

// New listing form - Admin only
router.get("/new", isLoggedIn, isAdmin, ...)

// Edit listing - Admin only
router.put("/:id", isLoggedIn, isAdmin, ...)

// Delete listing - Admin only
router.delete("/:id", isLoggedIn, isAdmin, ...)
```

### Admin Routes (`routes/admin.js`)
All admin routes are protected with `isAdmin` middleware:
- `/admin/login` - Admin login page
- `/admin/dashboard` - Dashboard home
- `/admin/bookings` - Bookings management
- `/admin/bookings/:id` - Booking details
- `/admin/listings` - Listings management
- `/admin/analytics` - Analytics dashboard
- `/admin/users` - Users management
- `/admin/calendar` - Booking calendar
- `/admin/api/calendar-data` - Calendar data API
- `/admin/export/bookings` - Export bookings CSV

### Controllers (`controllers/adminController.js`)
Comprehensive controller with methods for:
- Dashboard metrics calculation
- Bookings filtering and search
- Analytics data aggregation
- User statistics
- Calendar data formatting
- CSV export generation

## Installation & Setup

### 1. Install Dependencies
No additional dependencies required - uses existing packages.

### 2. Create Admin User
Run the admin creation script:
```bash
node scripts/createAdmin.js
```

Default credentials:
- Username: `admin`
- Password: `admin123`
- Email: `admin@wanderlust.com`

**Important**: Change the password after first login!

### 3. Update Existing Users (Optional)
To make an existing user an admin:
```javascript
// In MongoDB shell or script
db.users.updateOne(
  { username: "existinguser" },
  { $set: { role: "admin" } }
)
```

### 4. Start the Application
```bash
npm start
```

### 5. Access Admin Dashboard
Navigate to: `http://localhost:3000/admin/login`

## User Flow

### Regular User Flow
1. Sign up / Login at `/login`
2. Browse listings at `/listings`
3. View listing details at `/listings/:id`
4. Book a listing (redirects to payment)
5. View own bookings
6. Leave reviews
7. **Cannot access** `/listings/new`, `/listings/:id/edit`, or admin routes

### Admin User Flow
1. Login at `/admin/login`
2. Access admin dashboard at `/admin/dashboard`
3. Manage all bookings at `/admin/bookings`
4. Add/Edit/Delete listings at `/admin/listings` or `/listings/new`
5. View analytics at `/admin/analytics`
6. Manage users at `/admin/users`
7. View calendar at `/admin/calendar`
8. Export data as needed

## Security Features

1. **Role-Based Middleware**: All admin routes protected with `isAdmin` middleware
2. **Session Validation**: Checks authentication before role verification
3. **Route Protection**: Listing management routes restricted to admins only
4. **Flash Messages**: User-friendly error messages for unauthorized access
5. **Separate Login**: Admin login at different route (`/admin/login`)

## UI/UX Features

1. **Consistent Design**: Matches existing WanderLust theme
2. **Responsive Layout**: Works on desktop, tablet, and mobile
3. **Sidebar Navigation**: Easy access to all admin features
4. **Color-Coded Status**: Visual indicators for booking status
5. **Interactive Charts**: Chart.js for data visualization
6. **Calendar Integration**: FullCalendar for booking visualization
7. **Modal Dialogs**: Quick view without page navigation
8. **Loading States**: User feedback during operations
9. **Flash Messages**: Success/error notifications

## Export Functionality

### CSV Export
- Exports all bookings (or filtered results)
- Includes: Booking ID, User, Email, Listing, Location, Dates, Days, Guests, Amount, Status, Created At
- Downloads as `bookings.csv`

## Analytics Insights

### Available Metrics
1. **Booking Trends**: Track booking patterns over time
2. **Revenue Analysis**: Monitor income streams
3. **Status Distribution**: Understand booking lifecycle
4. **Category Performance**: Identify popular listing types
5. **Top Listings**: Recognize best performers
6. **User Activity**: Track user engagement

## Maintenance

### Regular Tasks
1. **Monitor Dashboard**: Check daily metrics
2. **Review Bookings**: Handle pending payments
3. **Update Listings**: Keep information current
4. **Analyze Trends**: Use analytics for decisions
5. **Manage Users**: Handle support requests

### Troubleshooting

#### Cannot Access Admin Dashboard
- Verify user has `role: 'admin'` in database
- Check if logged in at `/admin/login` (not `/login`)
- Clear browser cache and cookies

#### Charts Not Displaying
- Ensure Chart.js CDN is accessible
- Check browser console for errors
- Verify data is being passed to views

#### Calendar Not Loading
- Ensure FullCalendar CDN is accessible
- Check `/admin/api/calendar-data` endpoint
- Verify bookings exist in database

## Future Enhancements

Potential additions:
1. Email notifications for admins
2. Advanced filtering options
3. Bulk operations on bookings
4. Revenue forecasting
5. User activity logs
6. Automated reports
7. Dashboard customization
8. Multi-admin support with permissions
9. API for external integrations
10. Mobile app for admin

## Support

For issues or questions:
1. Check this documentation
2. Review error messages in browser console
3. Check server logs
4. Verify database connection
5. Ensure all dependencies are installed

## Conclusion

The admin dashboard provides comprehensive management capabilities for the WanderLust platform. It separates concerns between regular users and administrators, ensuring secure and efficient platform management while maintaining a user-friendly interface.