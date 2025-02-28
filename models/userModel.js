const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please enter your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please enter a valid email'],
  },
  name: String,

  password: {
    type: String,
    required: [true, 'Please enter your password'],
    minLength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],

    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: "Passwords don't match!",
    },
  },
  googleAuthSecret: String,
  otp: String,
  otpExpires: Date,
  googleId: String,
  accessToken: String,
  refreshToken: String,
});

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 8);
    this.passwordConfirm = undefined;
  }
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPasswod
) {
  const result = await bcrypt.compare(candidatePassword, userPasswod);

  return result;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
