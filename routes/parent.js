'use strict';

const express = require('express');
const passport = require('passport');

const User = require('../models/parent');
const Child = require('../models/child');
const Rewards = require('../models/rewards');
const Tasks = require('../models/tasks');

const createAuthToken = require('../helper/createAuthToken');
const checkError = require('../helper/checkErrors');
const missingField = require('../helper/missingFields');
const nonStringField = require('../helper/nonStringFields');
const trimmedFields = require('../helper/trimmedFields');
const tooBigOrTooSmall = require('../helper/tooBigOrTooSmall');
const populateParent = require('../helper/populateParent');


const router = express.Router();

/* =================================================================================== */
//  ================= Create New Parent User =====================

router.post('/', (req, res, next) => {

  //checks for any missing fields
  missingField(['username', 'password', 'email'], req);

  //checks to see if username and pass are not strings
  nonStringField(req);

  //removes white space
  trimmedFields(['username', 'password'],req);

  //checks username and password character lengths
  tooBigOrTooSmall(req);

  // Create new Parent in DB
  let { username, password, name, email, isParent } = req.body;

  return User.hashPassword(password)
    .then(digest => {
      const newUser = {
        username,
        password: digest,
        name,
        email,
        isPro: true
      };
      return User.create(newUser);
    })
    .then(result => {
      return res.status(201)
        .location(`/api/users/${result.id}`)
        .json(result);
    })
    .catch(err => {
      let checkErrorAnswer = checkError(err);
      next(checkErrorAnswer);
    });
});

/* =================================================================================== */
// ========= GET ALL USERS FOR DEVELOPMENT ONLY ====================
router.get('/', (req, res, next) => {
  User.find()
    .then(result => res.json(result));
});

/* ==================================================================================== */
// PROTECTION FOR THE FOLLOWING ENDPOINTS
router.use('/', passport.authenticate('jwt', { session: false, failWithError: true }));

/* =================================================================================== */

// ================ Create a Child User as a Parent =====================
router.post('/child', (req, res, next) => {
  //checks for any missing fields
  missingField(['username', 'password'], req);

  //checks to see if username and pass are not strings
  nonStringField(req);

  //removes white space
  trimmedFields(['username', 'password'],req);

  //checks username and password character lengths
  tooBigOrTooSmall(req);

  // Create the new user
  const { username, password, name, email } = req.body;
  const userId = req.user.id;

  return Child.hashPassword(password)
    .then(digest => {
      const newUser = {
        username,
        password: digest,
        name,
        // email,
        // isParent: false,
        parentId: userId
      };
      return Child.create(newUser);
    })
    .then(result => {
      let updateParent = {};
      Parent.find({ _id: userId })
        .then(parent => {
          updateParent.child = [...parent[0].child, result.id];
          return;
        })
        .then(() => {
          return Parent.findByIdAndUpdate(userId, updateParent, { new: true })
        })
        .then(parent => {
         return populateParent(parent.id);
        })
        .then((result) => {
          const authToken = createAuthToken(result);
          res.json({ authToken });
        });
    })
    .catch(err => {
      let checkErrorAnswer = checkError(err);
      next(checkErrorAnswer);
    });
});

/* =================================================================================== */
// DELETE A PARENT BY IDS
router.delete('/', (req, res, next) => {
  User.findById(req.user.id)
    // .then((result) => {
    //   // find and remove all associated Tasks
    //   return Tasks.find({ parentId: req.user.id }).remove();
    // })
    // .then(() => {
    //   // find and remove all 
    //   // return Rewards.find({ parentId: req.user.id }).remove();
    // })
    // .then(() => {
    //   return Child.find({ parentId: req.user.id }).remove();
    // })
    .then(() => { 
      return User.find({ _id: req.user.id }).remove();
    })
    .then(() => {
      res.status(204).end();
    })
    .catch(err => {
      let checkErrorAnswer = checkError(err);
      next(checkErrorAnswer);
    });
});

// ============== Delete a Child as a Parent =================
router.delete('/child/:id', (req, res, next) => {
  const { id } = req.params;

  Child.find({ _id: id })
    .then((result) => {
      return Tasks.find({ childId: id }).remove();
    })
    .then(() => {
      return Child.find({ _id: id }).remove();
    })
    .then(() => {
      return populateParent(req.user.id);
    })
    .then((result) => {
      const authToken = createAuthToken(result);
      return res.send({ authToken });
    })
    .catch(err => {
      let checkErrorAnswer = checkError(err);
      next(checkErrorAnswer);
    });
});

module.exports = router;