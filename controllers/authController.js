const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES,
  });

exports.register = catchAsync(async (req, res, next) => {
  const { email, password, passwordConfirm } = req.body;
  const secret = speakeasy.generateSecret({
    name: `todo-app:${email}`,
  });
  const newUser = await User.create({
    email,
    password,
    passwordConfirm,
    googleAuthSecret: secret.base32,
  });

  QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
    if (err) {
      return next(new AppError('QR Code generation failed', 500));
    }
    res.status(201).json({
      status: 'success',
      message: 'user registration successuflly',
      data: {
        user: newUser,
        qrCode: data_url,
      },
    });
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  res.cookie('email', email, {
    expires: new Date(
      Date.now() + process.env.JWT_EXPIRES * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
  });

  const otp = Math.floor(100000 + Math.random() * 900000);
  const otpExpires = Date.now() + 2 * 60 * 1000;

  user.otp = otp;
  user.otpExpires = otpExpires;
  await user.save({ validateBeforeSave: false });
  try {
    sendEmail(email, otp);
    res.status(200).json({
      status: 'success',
      data: {
        user: user,
        message: 'Please check your email for OTP verification',
      },
    });
  } catch (err) {
    console.log(err);
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError('There was an error sending the otp. Try again later!', 500)
    );
  }
});

exports.verifyOtp = catchAsync(async (req, res, next) => {
  const { otp } = req.body;
  const user = await User.findOne({ otp, otpExpires: { $gt: Date.now() } });
  if (!user) {
    return next(new AppError('Invalid OTP or OTP has expired', 401));
  }
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save({ validateBeforeSave: false });
  res.status(200).json({
    status: 'success',
    data: {
      user: user,
    },
  });
});

exports.verify2fa = catchAsync(async (req, res, next) => {
  const { passkey: token } = req.body;
  const user = await User.findOne({ email: req.email });
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  const verified = speakeasy.totp.verify({
    secret: user.googleAuthSecret,
    encoding: 'base32',
    window: 0,
    token,
  });
  if (!verified) {
    return next(new AppError('Inavalid 2FA token.', 401));
  }
  const jwtToken = signToken(user.id);

  res.cookie('jwt', jwtToken, {
    expires: new Date(
      Date.now() + process.env.JWT_EXPIRES * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
  });

  res.status(200).json({
    status: 'success',
    token: jwtToken,
    message: 'Log in successfully done',
  });
});

exports.logout = (req, res) => {
  res.clearCookie('jwt');
  res.status(200).json({ message: 'successfully logged out' });
};

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401
      )
    );
  }

  req.user = currentUser;
  next();
});

exports.setEmail = catchAsync(async (req, res, next) => {
  let email;
  if (req.body.email) {
    email = req.body.email;
  } else if (req.cookies.email) {
    email = req.cookies.email;
  }

  if (!email) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  const currentUser = await User.findOne({
    email: email,
  });
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this email does no longer exist.',
        401
      )
    );
  }

  req.email = email;
  next();
});

exports.isLoggedIn = catchAsync(async (req, res, next) => {
  if (req.cookies.jwt) {
    const decoded = await promisify(jwt.verify)(
      req.cookies.jwt,
      process.env.JWT_SECRET
    );

    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next('There is problem with that id', 401);
    }
    res.status(200).json({
      status: 'success',
    });
  } else {
    return next(
      new AppError('You are not logged in, plsease login to access', 401)
    );
  }
});
