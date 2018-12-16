const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const RideController = require('../controllers/ride');
const { requireJWT } = require('../middleware/authenticate');

const router = express.Router();

/**
 * POST /api/rides/start
 * request to unlock a vehicle that is online, locked, and not being charged
 * @param unlockCode
 * @return a new Ride object
 */
router.post(
  '/start',
  requireJWT,
  validate({
    body: { unlockCode: Joi.string().required(), latitude: Joi.number(), longitude: Joi.number() },
  }),
  RideController.unlockVehicle
);

/**
 * PATCH /api/rides/:_id
 * to update an ongoing ride with the new route and distance travelled
 *
 * @param incrementalEncodedPath - incremental path from last update
 * @param incrementalDistance - incremental distance from last update
 */
router.patch(
  '/:_id',
  requireJWT,
  validate({ body: { incrementalEncodedPath: Joi.string(), incrementalDistance: Joi.number() } }),
  RideController.updateRide
);

/**
 * POST /api/rides/:id/finish
 * request to finish an ongoing ride
 *
 * @param latitude
 * @param longitude
 * @param incrementalEncodedPath - incremental path from last update
 * @param incrementalDistance - incremental distance from last update
 * @return the updated Ride object
 */
router.post(
  '/:_id/finish',
  requireJWT,
  validate({
    body: {
      latitude: Joi.number(),
      longitude: Joi.number(),
      incrementalEncodedPath: Joi.string(),
      incrementalDistance: Joi.number(),
    },
  }),
  RideController.finishRide
);

/**
 * GET /api/rides/me
 * get history rides of current user
 *
 * @return an array of Ride objects
 */
router.get('/me', requireJWT, RideController.pastRides);

/**
 * GET /api/rides/me/ongoing
 * find the unfinished ride of current user
 */
router.get('/me/ongoing', requireJWT, RideController.getOngoingRide);

module.exports = router;
