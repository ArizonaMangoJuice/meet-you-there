'use strict';

const { Strategy: LocalStrategy } = require('passport-local');

const User = require('../models/parent');

const localStrategy = new LocalStrategy((username, password, done) => {
  let user;
  User.find({ username })
    // .populate({
    //   path: 'child', 
    //   model: 'Child', 
    //   populate: [
    //     {
    //       path: 'tasks',
    //       model: 'Tasks'
    //     },        
    //     {
    //       path: 'rewards',
    //       model: 'Rewards'
    //     }        
    //   ],      
    // })
    .then(results => {
      user = results[0];
      if (!user) {
        return Promise.reject({
          reason: 'LoginError',
          message: 'Incorrect username',
          location: 'username'
        });
      }

      return user.validatePassword(password);
    })
    .then(isValid => {
      if (!isValid) {
        return Promise.reject({
          reason: 'LoginError',
          message: 'Incorrect password',
          location: 'password'
        });
      }
      return done(null, user);
    })
    .catch(err => {
      if (err.reason === 'LoginError') {
        return done(null, false);
      }
      return done(err);
    });
});

module.exports = localStrategy;