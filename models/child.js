'use strict'; 

const mongoose = require ('mongoose');
const bcrypt = require('bcryptjs');

const postSchema = mongoose.Schema({

  title: {type: String, required: true},
  description: {type: String, required: true},
  videoPath: {type: String, required: true},
  userId: {type: mongoose.Schema.ObjectId, ref: 'Parent', required: true},
  likes: {type: Number, default: 0},
  dislikes: {type: Number, default: 0},
  // tasks: [
  //   {type: mongoose.Schema.ObjectId, ref: 'Tasks', required: true}
  // ],
  // rewards: [
  //   {type: mongoose.Schema.ObjectId, ref: 'Rewards'}
  // ]
  
    
  
});

postSchema.set('toObject', {
  transform: function (doc,ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password;
  }
});

postSchema.methods.validatePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

postSchema.statics.hashPassword = function (password) {
  return bcrypt.hash(password, 10);
};

module.exports = mongoose.model('Post', postSchema);

// child schema