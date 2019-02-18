const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const RideController = require('../controllers/ride');
const { requireJWT } = require('../middleware/authenticate');

const router = express.Router();

/**
 * POST /rides/start
 * request to unlock a vehicle
 * @param unlockCode
 * @return a new Ride object if operation is successful
 */
router.post(
  '/start',
  requireJWT,
  validate({
    body: { unlockCode: Joi.string().required() },
  }),
  RideController.startRide
);

/**
 * GET /rides/:_id
 * get the detail of a ride
 *
 */
router.get(
  '/:_id',
  requireJWT,
  validate({
    params: {
      _id: Joi.string().required(),
    },
  }),
  RideController.getRide
);

/**
 * PATCH /rides/:_id/pause
 * pause an ongoing ride
 */
router.patch(
  '/:_id/pause',
  requireJWT,
  validate({
    params: {
      _id: Joi.string().required(),
    },
  }),
  RideController.pauseRide
);

/**
 * PATCH /rides/:_id/resume
 * resume a paused ride
 */
router.patch(
  '/:_id/resume',
  requireJWT,
  validate({
    params: {
      _id: Joi.string().required(),
    },
  }),
  RideController.resumeRide
);

/**
 * POST /rides/:id/finish
 * request to finish an ongoing ride
 *
 * @return the updated Ride object
 */
router.post(
  '/:_id/finish',
  requireJWT,
  validate({
    params: {
      _id: Joi.string().required(),
    },
  }),
  RideController.finishRide
);

/**
 * POST /rides/:id/rate
 * rate a finished ride
 *
 */
router.post(
  '/:_id/rate',
  requireJWT,
  validate({
    params: {
      _id: Joi.string().required(),
    },
    data: {
      rating: Joi.number()
        .min(1)
        .max(5)
        .required(),
    },
  }),
  RideController.rateRide
);

/**
 * GET /rides/me
 * get history rides of current user
 *
 * @return an array of Ride objects
 */
router.get('/me/history', requireJWT, RideController.pastRides);

/**
 * GET /rides/me/ongoing
 * find the unfinished ride of current user
 */
router.get('/me/ongoing', requireJWT, RideController.getOngoingRide);

module.exports = router;
