if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
require("./passport-setup"); // << Google Strategy added here
const crypto = require("crypto");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const legalRoutes = require("./routes/legal.js");
const adminRouter = require("./routes/admin.js");
const Listing = require("./models/listing.js");

const searchRouter = require("./routes/search");
const categoryRouter = require("./routes/category");
const paymentRoutes = require("./routes/payment");
const chatRouter = require("./routes/chat.js");
const activityRouter = require("./routes/activity.js");
const subscriptionRouter = require("./routes/subscription.js");




app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Add JSON parsing for chat API
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

const dbUrl = process.env.MONGO_URL;

main().then(() => console.log("connected to db")).catch(console.log);
async function main() {
    await mongoose.connect(dbUrl);
}

const store = MongoStore.create({
    mongoUrl: dbUrl,
    touchAfter: 24 * 3600,
});

store.on("error", (err) => console.log("SESSION STORE ERROR", err));

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expire: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    }
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

// Local Strategy
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Subscription status checker middleware
const { checkSubscriptionStatus } = require("./middleware/subscriptionMiddleware");
const subscriptionChecker = require("./utils/subscriptionChecker");
app.use(checkSubscriptionStatus);

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    
    // Add subscription helper functions to res.locals
    if (req.user) {
        res.locals.isExpiringSoon = subscriptionChecker.isExpiringSoon(req.user);
        res.locals.daysUntilExpiry = subscriptionChecker.getDaysUntilExpiry(req.user);
    } else {
        res.locals.isExpiringSoon = false;
        res.locals.daysUntilExpiry = null;
    }
    
    next();
});

// Chatbase Hash Setup
app.use((req, res, next) => {
    if (req.user) {
        const userId = req.user._id.toString();
        const userHash = crypto.createHmac('sha256', process.env.CHATBASE_SECRET).update(userId).digest('hex');
        res.locals.userId = userId;
        res.locals.userHash = userHash;
    } else {
        res.locals.userId = null;
        res.locals.userHash = null;
    }
    next();
});

app.get("/", (req, res) => {
    res.redirect("/listings");
});

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);
app.use("/", legalRoutes);
app.use("/search", searchRouter);
app.use("/categories", categoryRouter);
app.use("/payment", paymentRoutes);
app.use("/subscription", subscriptionRouter);
app.use("/chat", chatRouter);
app.use("/admin", adminRouter);
app.use("/api/activity", activityRouter);



// Google Auth Routes
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect('/');
    }
);



app.use("/payment", paymentRoutes);





app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page Not Found!"));
});

app.use((err, req, res, next) => {
    const { statusCode = 500, message = "Something Went Wrong" } = err;
    res.status(statusCode).render("listings/error", { message });
});

app.listen(3000, () => {
    console.log("app listening on port 3000");
});

