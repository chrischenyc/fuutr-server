const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const RideController = require('../controllers/ride');
const { requireJWT } = require('../middleware/authenticate');

const router = express.Router();

/**
 * GET /api/rides/me/ongoing
 * find the unfinished ride of current user
 */
router.get('/me/ongoing', requireJWT, RideController.getOngoingRide);

/**
 * POST /api/rides/unlock
 * request to unlock a scooter that is online, locked, and not being charged
 * @param vehicleCode
 * @return a new Ride object
 */
router.post(
  '/unlock',
  requireJWT,
  validate({
    body: { vehicleCode: Joi.string().required(), latitude: Joi.number(), longitude: Joi.number() },
  }),
  RideController.unlockScooter
);

/**
 * POST /api/rides/lock
 * request to lock a scooter which the user is currently ridings
 * @param scooterId
 * @param rideId
 * @return the updated Ride object
 */
router.post(
  '/lock',
  requireJWT,
  validate({
    body: {
      scooterId: Joi.string().required(),
      rideId: Joi.string().required(),
      latitude: Joi.number(),
      longitude: Joi.number(),
      encodedPath: Joi.string(),
      distance: Joi.number(),
    },
  }),
  RideController.lockScooter
);

/**
 * GET /api/rides/me
 * get history rides of current user
 * @return an array of Ride objects
 */
router.get('/me', requireJWT, RideController.pastRides);

// /rides/{id} PATCH - update a ride during riding

module.exports = router;
