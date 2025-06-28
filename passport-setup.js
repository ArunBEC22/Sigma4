const User = require("./models/user"); // ensure correct path
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Try to find the user based on Google ID or email
      let existingUser = await User.findOne({ googleId: profile.id });

      // If not found by googleId, try by email (optional)
      if (!existingUser) {
        existingUser = await User.findOne({ email: profile.emails[0].value });
      }

      // If user already exists, return it
      if (existingUser) {
        return done(null, existingUser);
      }

      // Otherwise create a new one
      const newUser = new User({
        username: profile.displayName,
        email: profile.emails[0].value,
        googleId: profile.id
      });

      const savedUser = await newUser.save();
      return done(null, savedUser);
    } catch (err) {
      return done(err);
    }
  }
));
