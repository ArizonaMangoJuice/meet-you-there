'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');

const localStrategy = require('./auth/local');
const localChildStrategy = require('./auth/local-child');

const jwtStrategy = require('./auth/jwt');
const { PORT, CLIENT_ORIGIN } = require('./config');
const { dbConnect } = require('./db-mongoose');

// ROUTERS
const authRouter = require('./routes/auth');
const tasksRouter = require('./routes/tasks');
const rewardsRouter = require('./routes/rewards');
const parentRouter = require('./routes/parent');
const childRouter = require('./routes/child');
const videoRouter = require('./routes/videoStream')
// Express app
const app = express();

// MORGAN
app.use(
  morgan(process.env.NODE_ENV === 'production' ? 'common' : 'dev', {
    skip: (req, res) => process.env.NODE_ENV === 'test'
  })
);

// CORS
app.use(
  cors({
    origin: CLIENT_ORIGIN
  })
);

// Parse requiest body
app.use(express.json());

// Auth
passport.use('localParent', localStrategy);
passport.use('localChild',localChildStrategy);
passport.use(jwtStrategy);

// Endpoints
app.use('/api', authRouter);
app.use('/api/video', videoRouter);
app.use('/api/parent', parentRouter);
app.use('/api/child', childRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/rewards', rewardsRouter);

// Catch-all 404
app.use(function(req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  console.error(err);
  next(err);
});


app.use((err,req,res,next) => {
  res.status(err.status || 500);

  res.json({
    message: err.message,
    error: err
  });
});

function runServer(port = PORT) {
  const server = app
    .listen(port, () => {
      console.info(`App listening on port ${server.address().port}`);
    })
    .on('error', err => {
      console.error('Express failed to start');
      console.error(err);
    });
}

if (require.main === module) {
  dbConnect();
  runServer();
}

module.exports = { app };
