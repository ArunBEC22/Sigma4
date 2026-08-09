const Listing = require("../models/listing");
const Booking = require("../models/bookings");
const User = require("../models/user");
const Review = require("../models/review");

// Render Admin Login Page
module.exports.renderAdminLogin = (req, res) => {
    res.render("admin/login.ejs");
};

// Admin Login
module.exports.adminLogin = async (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
        req.flash("error", "Access denied. Admin privileges required.");
        return res.redirect("/login");
    }
    req.flash("success", "Welcome to Admin Dashboard!");
    res.redirect("/admin/dashboard");
};

// Render Admin Dashboard Home
module.exports.renderDashboard = async (req, res) => {
    try {
        // Get key metrics
        const totalBookings = await Booking.countDocuments();
        const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
        const pendingBookings = await Booking.countDocuments({ status: 'pending_payment' });
        
        // Calculate total revenue (only confirmed bookings)
        const revenueData = await Booking.aggregate([
            { $match: { status: 'confirmed' } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;
        
        // Get active listings count
        const totalListings = await Listing.countDocuments();
        
        // Get total users
        const totalUsers = await User.countDocuments();
        
        // Get recent bookings (last 10)
        const recentBookings = await Booking.find()
            .populate('user', 'username email')
            .populate('listing', 'title location')
            .sort({ createdAt: -1 })
            .limit(10);
        
        // Get today's bookings
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todayBookings = await Booking.countDocuments({
            createdAt: { $gte: today, $lt: tomorrow }
        });
        
        // Get this week's revenue
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekRevenueData = await Booking.aggregate([
            { 
                $match: { 
                    status: 'confirmed',
                    createdAt: { $gte: weekAgo }
                } 
            },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const weekRevenue = weekRevenueData.length > 0 ? weekRevenueData[0].total : 0;
        
        res.render("admin/dashboard.ejs", {
            totalBookings,
            confirmedBookings,
            pendingBookings,
            totalRevenue,
            totalListings,
            totalUsers,
            recentBookings,
            todayBookings,
            weekRevenue
        });
    } catch (err) {
        console.error(err);
        req.flash("error", "Error loading dashboard");
        res.redirect("/listings");
    }
};

// Get All Bookings with Filters
module.exports.getAllBookings = async (req, res) => {
    try {
        const { status, listing, search, startDate, endDate } = req.query;
        
        // Build query
        let query = {};
        
        if (status && status !== 'all') {
            query.status = status;
        }
        
        if (listing && listing !== 'all') {
            query.listing = listing;
        }
        
        if (startDate && endDate) {
            query.checkinDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        
        // Get bookings
        let bookings = await Booking.find(query)
            .populate('user', 'username email')
            .populate('listing', 'title location price')
            .sort({ createdAt: -1 });
        
        // Search filter (if provided)
        if (search) {
            bookings = bookings.filter(booking => {
                const searchLower = search.toLowerCase();
                const username = booking.user ? booking.user.username.toLowerCase() : '';
                const email = booking.user ? booking.user.email.toLowerCase() : '';
                const bookingId = booking._id.toString();
                
                return username.includes(searchLower) ||
                       email.includes(searchLower) ||
                       bookingId.includes(searchLower);
            });
        }
        
        // Get all listings for filter dropdown
        const allListings = await Listing.find().select('title');
        
        res.render("admin/bookings.ejs", {
            bookings,
            allListings,
            filters: { status, listing, search, startDate, endDate }
        });
    } catch (err) {
        console.error(err);
        req.flash("error", "Error loading bookings");
        res.redirect("/admin/dashboard");
    }
};

// Get Booking Details
module.exports.getBookingDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await Booking.findById(id)
            .populate('user')
            .populate('listing')
            .populate('conversationId');
        
        if (!booking) {
            req.flash("error", "Booking not found");
            return res.redirect("/admin/bookings");
        }
        
        res.render("admin/bookingDetails.ejs", { booking });
    } catch (err) {
        console.error(err);
        req.flash("error", "Error loading booking details");
        res.redirect("/admin/bookings");
    }
};

// Update Booking Status
module.exports.updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        await Booking.findByIdAndUpdate(id, { status });
        
        req.flash("success", "Booking status updated successfully");
        res.redirect(`/admin/bookings/${id}`);
    } catch (err) {
        console.error(err);
        req.flash("error", "Error updating booking status");
        res.redirect("/admin/bookings");
    }
};


// Get All Users
module.exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        
        // Get booking count for each user
        const usersWithStats = await Promise.all(
            users.map(async (user) => {
                const bookingCount = await Booking.countDocuments({ user: user._id });
                const totalSpent = await Booking.aggregate([
                    { $match: { user: user._id, status: 'confirmed' } },
                    { $group: { _id: null, total: { $sum: "$amount" } } }
                ]);
                
                return {
                    ...user.toObject(),
                    bookingCount,
                    totalSpent: totalSpent.length > 0 ? totalSpent[0].total : 0
                };
            })
        );
        
        res.render("admin/users.ejs", { users: usersWithStats });
    } catch (err) {
        console.error(err);
        req.flash("error", "Error loading users");
        res.redirect("/admin/dashboard");
    }
};

// Render Admin Listings Management
module.exports.renderAdminListings = async (req, res) => {
    try {
        const listings = await Listing.find()
            .populate('owner', 'username')
            .sort({ createdAt: -1 });
        
        // Get booking stats for each listing
        const listingsWithStats = await Promise.all(
            listings.map(async (listing) => {
                const bookingCount = await Booking.countDocuments({ 
                    listing: listing._id,
                    status: 'confirmed'
                });
                
                const revenueData = await Booking.aggregate([
                    { 
                        $match: { 
                            listing: listing._id,
                            status: 'confirmed'
                        } 
                    },
                    { $group: { _id: null, total: { $sum: "$amount" } } }
                ]);
                
                const revenue = revenueData.length > 0 ? revenueData[0].total : 0;
                
                // Get average rating
                const reviews = await Review.find({ _id: { $in: listing.reviews } });
                const avgRating = reviews.length > 0 
                    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
                    : 0;
                
                return {
                    ...listing.toObject(),
                    bookingCount,
                    revenue,
                    avgRating: avgRating.toFixed(1)
                };
            })
        );
        
        res.render("admin/listings.ejs", { listings: listingsWithStats });
    } catch (err) {
        console.error(err);
        req.flash("error", "Error loading listings");
        res.redirect("/admin/dashboard");
    }
};

// Export Bookings as CSV
module.exports.exportBookings = async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate('user', 'username email')
            .populate('listing', 'title location');
        
        // Create CSV content
        let csv = 'Booking ID,User,Email,Listing,Location,Check-in,Check-out,Days,Guests,Amount,Status,Created At\n';
        
        bookings.forEach(booking => {
            csv += `${booking.user ? booking.user.username : 'Deleted User'},`;
            csv += `${booking.user ? booking.user.email : 'N/A'},`;
            csv += `${booking.listing ? booking.listing.title : 'Deleted Listing'},`;
            csv += `${booking.listing ? booking.listing.location : 'N/A'},`;
            csv += `${booking.checkinDate ? booking.checkinDate.toISOString().split('T')[0] : 'N/A'},`;
            csv += `${booking.checkoutDate ? booking.checkoutDate.toISOString().split('T')[0] : 'N/A'},`;
            csv += `${booking.stayDays || 0},`;
            csv += `${booking.guests || 0},`;
            csv += `${booking.amount || 0},`;
            csv += `${booking.status},`;
            csv += `${booking.createdAt ? booking.createdAt.toISOString().split('T')[0] : 'N/A'}\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=bookings.csv');
        res.send(csv);
    } catch (err) {
        console.error(err);
        req.flash("error", "Error exporting bookings");
        res.redirect("/admin/bookings");
    }
};

// Render Calendar View
module.exports.renderCalendar = async (req, res) => {
    try {
        res.render("admin/calendar.ejs");
    } catch (err) {
        console.error(err);
        req.flash("error", "Error loading calendar");
        res.redirect("/admin/dashboard");
    }
};

// Get Calendar Data (API endpoint)
module.exports.getCalendarData = async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate('listing', 'title')
            .populate('user', 'username');
        
        // Format for FullCalendar - filter out bookings with null user or listing
        const events = bookings
            .filter(booking => booking.user && booking.listing)
            .map(booking => ({
                id: booking._id,
                title: `${booking.listing.title} - ${booking.user.username}`,
                start: booking.checkinDate,
                end: booking.checkoutDate,
                color: booking.status === 'confirmed' ? '#28a745' :
                       booking.status === 'pending_payment' ? '#ffc107' :
                       booking.status === 'cancelled' ? '#dc3545' : '#6c757d',
                extendedProps: {
                    status: booking.status,
                    guests: booking.guests,
                    amount: booking.amount
                }
            }));
        
        res.json(events);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error loading calendar data" });
    }
};

// Made with Bob




// Render Reports & Insights Page
module.exports.renderReports = async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        // Calculate occupancy rate (last 30 days)
        const totalListings = await Listing.countDocuments();
        const bookingsLast30Days = await Booking.countDocuments({
            createdAt: { $gte: thirtyDaysAgo },
            status: 'confirmed'
        });
        const occupancyRate = totalListings > 0 ? (bookingsLast30Days / (totalListings * 30)) * 100 : 0;

        // Average booking value
        const avgBookingData = await Booking.aggregate([
            { $match: { status: 'confirmed' } },
            { $group: { _id: null, avg: { $avg: "$amount" } } }
        ]);
        const averageBookingValue = avgBookingData.length > 0 ? avgBookingData[0].avg : 0;

        // Average stay duration
        const bookingsWithDuration = await Booking.find({ status: 'confirmed' });
        let totalDays = 0;
        bookingsWithDuration.forEach(booking => {
            if (booking.checkIn && booking.checkOut) {
                const days = Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24));
                totalDays += days;
            }
        });
        const averageStayDuration = bookingsWithDuration.length > 0 ? totalDays / bookingsWithDuration.length : 0;

        // Repeat customer rate
        const userBookingCounts = await Booking.aggregate([
            { $match: { status: 'confirmed' } },
            { $group: { _id: "$user", count: { $sum: 1 } } }
        ]);
        const repeatCustomers = userBookingCounts.filter(u => u.count > 1).length;
        const repeatCustomerRate = userBookingCounts.length > 0 ? (repeatCustomers / userBookingCounts.length) * 100 : 0;

        // Revenue breakdown
        const thisMonthRevenue = await Booking.aggregate([
            { $match: { status: 'confirmed', createdAt: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
        ]);
        const lastMonthRevenue = await Booking.aggregate([
            { $match: { status: 'confirmed', createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
            { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
        ]);
        const thisYearRevenue = await Booking.aggregate([
            { $match: { status: 'confirmed', createdAt: { $gte: startOfYear } } },
            { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
        ]);

        const thisMonthData = thisMonthRevenue[0] || { total: 0, count: 0 };
        const lastMonthData = lastMonthRevenue[0] || { total: 0, count: 0 };
        const growth = lastMonthData.total > 0 ? ((thisMonthData.total - lastMonthData.total) / lastMonthData.total) * 100 : 0;

        const revenueBreakdown = {
            thisMonth: { revenue: thisMonthData.total, bookings: thisMonthData.count, growth },
            lastMonth: { revenue: lastMonthData.total, bookings: lastMonthData.count },
            thisYear: { revenue: (thisYearRevenue[0] || { total: 0 }).total, bookings: (thisYearRevenue[0] || { count: 0 }).count }
        };

        // Top performing listings
        const topListings = await Booking.aggregate([
            { $match: { status: 'confirmed' } },
            { $group: { _id: "$listing", bookings: { $sum: 1 }, revenue: { $sum: "$amount" } } },
            { $sort: { revenue: -1 } },
            { $limit: 5 }
        ]);
        await Listing.populate(topListings, { path: '_id', select: 'title' });
        const topListingsFormatted = topListings.map(item => ({
            listing: item._id,
            bookings: item.bookings,
            revenue: item.revenue
        }));

        // Customer insights
        const totalUsers = await User.countDocuments();
        const usersWithBookings = userBookingCounts.length;
        const newCustomers = userBookingCounts.filter(u => u.count === 1).length;
        const returningCustomers = repeatCustomers;
        const totalRevenue = (thisYearRevenue[0] || { total: 0 }).total;
        const lifetimeValue = usersWithBookings > 0 ? totalRevenue / usersWithBookings : 0;

        const customerInsights = {
            totalCustomers: usersWithBookings,
            newCustomers,
            returningCustomers,
            lifetimeValue
        };

        // Action items
        const pendingBookings = await Booking.countDocuments({ status: 'pending_payment' });
        const actionItems = [];
        
        if (pendingBookings > 5) {
            actionItems.push({
                title: `${pendingBookings} Pending Payments`,
                description: 'Multiple bookings awaiting payment confirmation',
                priority: 'high'
            });
        }
        
        if (occupancyRate < 30) {
            actionItems.push({
                title: 'Low Occupancy Rate',
                description: `Current occupancy at ${occupancyRate.toFixed(1)}%. Consider promotional campaigns.`,
                priority: 'medium'
            });
        }

        // Booking status
        const bookingStatus = {
            confirmed: await Booking.countDocuments({ status: 'confirmed' }),
            pending: await Booking.countDocuments({ status: 'pending_payment' }),
            cancelled: await Booking.countDocuments({ status: 'cancelled' }),
            completed: await Booking.countDocuments({ status: 'completed' })
        };

        res.render("admin/reports.ejs", {
            page: 'reports',
            pageTitle: 'Reports & Insights',
            occupancyRate,
            averageBookingValue,
            averageStayDuration,
            repeatCustomerRate,
            revenueBreakdown,
            topListings: topListingsFormatted,
            customerInsights,
            actionItems,
            bookingStatus
        });
    } catch (err) {
        console.error("Error loading reports:", err);
        req.flash("error", "Error loading reports");
        res.redirect("/admin/dashboard");
    }
};
