const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const authRouter = require('./routes/authRoutes');
const taskRouter = require('./routes/taskRoutes');
require('./utils/passportConfig');

const app = express();

app.set('trust proxy', 1);
app.use(
  cors({
    origin: 'https://mehedi-todo-app.netlify.app',
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.DATABASE,
      collectionName: 'sessions',
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
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
