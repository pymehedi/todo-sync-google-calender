const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userModel');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        'https://todo-sync-google-calender.onrender.com/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if a user with this Google ID already exists
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // Check if an existing user has the same email
          user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
            // Existing user found, link Google account
            user.googleId = profile.id;
            user.accessToken = accessToken;
            user.refreshToken = refreshToken;
            await user.save({ validateBeforeSave: false });
          } else {
            // No user found, do NOT create a new user
            return done(null, false, {
              message: 'No account found. Please sign up first.',
            });
          }
        } else {
          // Existing user with Google login, update tokens
          user.accessToken = accessToken;
          user.refreshToken = refreshToken;
          await user.save({ validateBeforeSave: false });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});
