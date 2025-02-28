const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const authRouter = require('./routes/authRoutes');
const taskRouter = require('./routes/taskRoutes');
require('./utils/passportConfig');

const app = express();

app.use(
  cors({
    origin: 'http://localhost:5173', // Set specific frontend URL
    credentials: true, // Allow credentials (cookies, auth headers, etc.)
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use('/', authRouter);
app.use('/', taskRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
