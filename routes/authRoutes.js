const express = require('express');
const passport = require('passport');
const authController = require('../controllers/authController');
// const userController = require('../controllers/userController');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/verify-otp', authController.verifyOtp);
router.post('/verify-2fa', authController.setEmail, authController.verify2fa);
router.get('/isLoggedIn', authController.isLoggedIn);

// Google OAuth login
router.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/calendar', // Google Calendar access
    ],
    accessType: 'offline',
    prompt: 'consent',
  })
);

// Google OAuth callback

router.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    successRedirect: '/success',
    failureRedirect: '/login',
  })
);

// Disconnect Google Account
router.get('/auth/google/disconnect', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      accessToken: null,
      refreshToken: null,
    });
    res.json({ message: 'Google account disconnected.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect Google account.' });
  }
});

router.get('/success', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the React | Todo Application',
  });
});
module.exports = router;
