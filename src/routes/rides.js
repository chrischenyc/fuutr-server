const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const RideController = require('../controllers/ride');
const { requireJWT } = require('../middleware/authenticate');

const router = express.Router();

/**
 * POST /rides/start
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
 * TODO: remove this API, update ride route from segway push data
 * PATCH /rides/:_id
 * to update an ongoing ride with the new route and distance travelled
 *
 * @param incrementalEncodedPath - incremental path from last update
 * @param incrementalDistance - incremental distance from last update
 */
router.patch(
  '/:_id',
  requireJWT,
  validate({
    params: {
      _id: Joi.string().required(),
    },
    body: { incrementalEncodedPath: Joi.string(), incrementalDistance: Joi.number() },
  }),
  RideController.updateRide
);

/**
 * PATCH /rides/:_id/pause
 * pause an ongoing ride
 *
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
 *
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
 * @param latitude
 * @param longitude
 * TODO: remove incremental params, as the route data will be collected via segway push
 * @param incrementalEncodedPath - incremental path from last update
 * @param incrementalDistance - incremental distance from last update
 * @return the updated Ride object
 */
router.post(
  '/:_id/finish',
  requireJWT,
  validate({
    params: {
      _id: Joi.string().required(),
    },
    body: {
      latitude: Joi.number(),
      longitude: Joi.number(),
      incrementalEncodedPath: Joi.string()
        .allow('')
        .optional(),
      incrementalDistance: Joi.number().optional(),
    },
  }),
  RideController.finishRide
);

/**
 * GET /rides/me
 * get history rides of current user
 *
 * @return an array of Ride objects
 */
router.get('/me', requireJWT, RideController.pastRides);

/**
 * GET /rides/me/ongoing
 * find the unfinished ride of current user
 */
router.get('/me/ongoing', requireJWT, RideController.getOngoingRide);

module.exports = router;
