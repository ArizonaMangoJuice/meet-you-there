'use strict';

const express = require('express');
const passport = require('passport');

const Post = require('../models/child');

const router = express.Router();

/* =================================================================================== */
// ========== GET ALL CHILD ACCOUNTS FOR DEVELOPMENT ONLY ===================
router.get('/', (req, res, next) => {
  Post.find()
    .then(user => {
      res.json(user);
    })
    .catch(err => {
      console.error(err);
      next(err);
    });
});

router.get('/:id', (req, res, next) => {
  Post.find({_id: req.params.id})
    .then(user => {
      res.json(user);
    })
    .catch(err => {
      let error = new Error('invalid id');
      error.status = 400;
      next(error);
    });
});

router.post('/', (req, res, next) => {
  let { title, description, videoPath, userId } = req.body;
  let newPost = {
    title,
    description,
    videoPath,
    userId
  }
  return Post.create(newPost)
    .then(result => {
      return res.status(201)
        .location(`./api/child/${result.id}`)
        .json(result)
    })

});


/* ==================================================================================== */
// PROTECTION FOR THE FOLLOWING ENDPOINTS
router.use('/', passport.authenticate('jwt', {session: false, failWithError: true}));



module.exports = router;