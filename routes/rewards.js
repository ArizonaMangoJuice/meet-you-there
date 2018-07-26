'use strict';

const express = require('express');

const moment = require('moment');
const router = express.Router();
const passport = require('passport');

const Rewards = require('../models/rewards');
const Parent = require('../models/parent');
const Child = require('../models/child');

const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRY } = require('../config');

//move to helper folder
function createAuthToken(user) {
  return jwt.sign({ user }, JWT_SECRET, {
    subject: user.username,
    expiresIn: JWT_EXPIRY
  });
}

router.use('/', passport.authenticate('jwt', { session: false, failWithError: true }));

// ============ Create Reward as Parent ===============
router.post('/:childId', (req, res, next) => {
  let { name, pointValue, purchased, day, hour } = req.body;
  let {childId} = req.params;
  const { id } = req.user;
  let updatedRewards;
  let rewardTest;
  let updateChildRewards;
  if (!day) day = 0;
  if (!hour) hour = 0;
  let updateParent = {};
  Rewards.create({
    parentId: id,
    childId,
    name,
    pointValue,
    purchased,
    currentTime: moment().valueOf(),
    expiryDate: moment().add(day, 'days').add(hour, 'hours').valueOf()
  })
    .then(reward => {
      console.log('reward =>>', reward);
      rewardTest = reward;
      return Parent.findById(id);

      // .catch((err) => console.log(err));
    })
    .then(child => {
      updateChildRewards = { rewards: [...child.rewards, rewardTest.id] };
      // updateParent.rewards = updatedRewards;
      console.log('updatedRewards', updatedRewards);
      console.log(true);
      return;
    })
    .then(() => {
      return Child.findByIdAndUpdate(childId, updateChildRewards);
    })
    .then(() => {
      console.log('parent ', req.user.rewards);
      let rewardsIds = req.user.rewards.map((reward) => reward.id);
      updatedRewards = { rewards: [...rewardsIds, rewardTest.id] };
      // updateParent.rewards = updatedRewards;
      console.log('updatedRewards', updatedRewards);
      console.log(true);
      return;
    })
    .then(() => {
      return Parent.findByIdAndUpdate({ _id: id }, updatedRewards, { new: true });
    })
    .then((result) => {
      console.log('before populate', result);
      return Parent.findById(result.id)
        .populate([{
          path: 'child',
          model: 'Child',
          populate: {
            path: 'tasks',
            model: 'Tasks'
          },
          populate: {
            path: 'rewards',
            model: 'Rewards'
          }
        },
        {
          path: 'rewards',
          model: 'Rewards'
        }]);
    })
    .then((result) => {
      console.log('result', result);
      const authToken = createAuthToken(result);
      return res.send({ authToken });
    })
    .catch(err => {
      console.log(err);
      if (err.code === 11000) {
        let error = new Error('Same name for reward');
        error.status = 400;
        next(error);
      }
      if (err.message === 'Rewards validation failed: name: Path `name` is required.') {
        let error = new Error('name is required');
        error.status = 400;
        next(error);
      }
      if (err.message === 'Rewards validation failed: pointValue: Path `pointValue` is required.') {
        let error = new Error('pointValue are required');
        error.status = 400;
        next(error);
      }

      next(err);
    });
});

// ============ GET Rewards as Parent =============

router.get('/', (req, res, next) => {
  const { id } = req.user;

  Rewards.find({ parentId: id })
    .then(rewards => {
      res.json(rewards);
    })
    .catch(err => {
      next(err);
    });
});

// ============== Update Reward as Parent ==================
router.put('/:id', (req, res, next) => {
  const { id } = req.params;
  let { name, pointValue, hour, day } = req.body;
  hour = parseInt(hour);
  day = parseInt(day);
  const updatedReward = {};

  if (name) {
    updatedReward.name = name;
  }
  if (pointValue) {
    updatedReward.pointValue = pointValue;
  }
  if (hour > 0 || day > 0) {
    console.log('this ran');
    updatedReward.expiryDate = moment().add(day, 'days').add(hour, 'hours').valueOf();
  }
  if (hour === 0 && day === 0) {
    Rewards.findById(id)
      .then(result => updatedReward.expiryDate = result.currentTime)
      .then(() => {
        return Rewards.findByIdAndUpdate({ _id: id, parentId: req.user.id }, updatedReward, { new: true });
      })
      .then((result) => {
        console.log('before populate', result);
        return Parent.findById(result.parentId)
          .populate([{
            path: 'child',
            model: 'Child',
            populate:[ 
              {
                path: 'tasks',
                model: 'Tasks'
              },
              {
                path: 'rewards',
                model: 'Rewards'
              }
            ],
          },
          {
            path: 'rewards',
            model: 'Rewards'
          }])
      })
      .then((result) => {
        console.log('result', result);
        const authToken = createAuthToken(result);
        return res.send({ authToken });
      })
      .catch(err => {
        next(err);
      });

  } else {
    Rewards.findByIdAndUpdate({ _id: id, parentId: req.user.id }, updatedReward, { new: true })
      .then((result) => {
        console.log('before populate', result);
        return Parent.findById(result.parentId)
          .populate([{
            path: 'child',
            model: 'Child',
            populate: [
              {
                path: 'tasks',
                model: 'Tasks'
              },
              {
                path: 'rewards',
                model: 'Rewards'
              }
            ],
          },
          {
            path: 'rewards',
            model: 'Rewards'
          }]);
      })
      .then((result) => {
        console.log('result', result);
        const authToken = createAuthToken(result);
        return res.send({ authToken });
      })
      .catch(err => {
        next(err);
      });
  }
});

// =========== DELETE Rewards as Parent =====================

router.delete('/:id', (req, res, next) => {
  const { id } = req.params;
  // console.log(req.user);
  let rewardInfo;
  Rewards.findById(id)
    .then(reward => {
      rewardInfo = reward;
      // console.log(rewardInfo.childId);
      // res.json(rewardInfo);
      return Child.findById(rewardInfo.childId);
    })
    .then(child => {
      console.log(child);
      let newRewards = child.rewards.filter(reward => reward.id === id);
      return Child.findByIdAndUpdate(child.id, {rewards: newRewards});
    })
    .then(() => {
      return Rewards.deleteOne({ _id: id, parentId: req.user.id });
    })
    .then(() => {
      return Parent.findById(req.user.id)
        .populate([{
          path: 'child',
          model: 'Child',
          populate:[{           
            path: 'tasks',
            model: 'Tasks'
          }, {
            path: 'rewards',
            model: 'Rewards'
          }],
        },
        {
          path: 'rewards',
          model: 'Rewards'
        }]);
    })
    .then((result) => {
      res.json(result);
    });
  // Rewards.deleteOne({ _id: id, parentId: req.user.id })
  //   .then(() => Rewards.findById(id))
  //   .then(res => {
  //     console.log(res);
  //     let newRewards = req.user.rewards.filter(reward => reward.id !== id);
  //     console.log('newRewards', newRewards[0].childId);
     
  //     return Child.findById({_id:newRewards[0].childId});
  //   })
  //   .then(res => {
  //     console.log('RESSSS',res);
  //     // var id = mongoose.Types.ObjectId('4edd40c86762e0fb12000003');
  //     let updateChild = {rewards: [id]};
  //     console.log('UPDATECHILD',updateChild);
  //     return Child.updateOne({_id: res.id}, updateChild);
  //   })
  //   .then(() => {
  //   // console.log('before populate', result)
  //     return Parent.findById(req.user.id)
  //       .populate([{
  //         path: 'child',
  //         model: 'Child',
  //         populate:{           
  //             path: 'tasks',
  //             model: 'Tasks'
  //         },
  //       },
  //       {
  //         path: 'rewards',
  //         model: 'Rewards'
  //       }]);
  //   })
  //   .then((result) => {
  //     console.log('result', result);
  //     const authToken = createAuthToken(result);
  //     return res.send({ authToken });
  //   })
  //   .catch(error => {
  //     next(error);
  //   });
});



// =========== GET Rewards as Child ==============

router.get('/child', (req, res, next) => {
  const { parentId } = req.user;
  console.log('xx', parentId);


  Rewards.find({ parentId })
    .then(rewards => {
      res.json(rewards);
    })
    .catch(err => {
      next(err);
    });
});

// =========== Purchase Reward as Child ==========

router.put('/child/:id', (req, res, next) =>{
  const { id } = req.params;
  const childId = req.user.id;
  let editedReward;
  //reward id
  Rewards.findById(id)
    .then(res => {
      if(res.purchased === true){
        const error = new Error('Reward already purchased');
        error.status = 400;
        throw next(error);
      }
      else {
        let { purchased } = req.body;
        const updateReward = {};
        if(purchased === true){
          updateReward.purchased = purchased;
        }
        return Rewards.findByIdAndUpdate({_id: id}, updateReward, {new:true})
      }
    })
    .then(result => {
      editedReward = result;
      console.log('result',result);
      let newChild = {
        currentPoints: req.user.currentPoints - editedReward.pointValue         
      };   
      // res.json(result);
      return Child.findByIdAndUpdate(childId, newChild);
    })
    .then(() => res.json(editedReward))
    .catch(err => {
      next(err);
    })    

  // if (purchased === true){
  //   const error = new Error('Reward already purchased');
  //   error.status = 400;
  //   return next(error);

  // } else if (purchased) {
  //   updateReward.purchased = purchased;
  // } 

  // Rewards.findByIdAndUpdate({_id: id}, updateReward, {new:true})
  //   .then(result => {
  //     console.log('result',result);
      
  //     res.json(result);
  //   })
  //   .catch(err => {
  //     next(err);
  //   })
});

module.exports = router;



//DELETE REWARD AS PARENT NEEDS FIX

// router.delete('/:id', (req, res, next) => {
//   const { id } = req.params;
//   Rewards.deleteOne({ _id: id, parentId: req.user.id })
//     // .then(() => Rewards.findById(id))
//     .then( () => {
//       let newRewards = req.user.rewards.filter(reward => reward.id === id);
//       console.log('newRewards', newRewards[0].childId);
     
//       return Child.findById({_id:newRewards[0].childId})
//     })
//     .then(res => {
//       console.log('RESSSS',res);
//       var id = mongoose.Types.ObjectId('4edd40c86762e0fb12000003');
//       let updateChild = {rewards: [id]}
//       console.log('UPDATECHILD',updateChild);
//       return Child.findByIdAndUpdate({id: res.id}, updateChild)
//     })
//     .then(() => {
//     // console.log('before populate', result)
//       return Parent.findById(req.user.id)
//         .populate([{
//           path: 'child',
//           model: 'Child',
//           populate:{           
//               path: 'tasks',
//               model: 'Tasks'
//           },
//         },
//         {
//           path: 'rewards',
//           model: 'Rewards'
//         }]);
//     })
//     .then((result) => {
//       console.log('result', result);
//       const authToken = createAuthToken(result);
//       return res.send({ authToken });
//     })
//     .catch(error => {
//       next(error);
//     });
//  });
 