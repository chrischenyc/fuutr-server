const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const router = express.Router();

const { requireJWT } = require('../middleware/authenticate');
const ScooterController = require('../controllers/scooter');

/**
 * GET /scooters/search-in-bound?minLatitude=&minLongitude=&maxLatitude=&maxLongitude=
 * search scooters nearby
 */
// TODO: replace with radius search
router.get(
  '/search-in-bound',
  requireJWT,
  validate({
    query: {
      minLatitude: Joi.number()
        .min(-90)
        .max(90)
        .required(),
      minLongitude: Joi.number()
        .min(-180)
        .max(180)
        .required(),
      maxLatitude: Joi.number()
        .min(-90)
        .max(90)
        .required(),
      maxLongitude: Joi.number()
        .min(-180)
        .max(180)
        .required(),
    },
  }),
  ScooterController.searchScootersInBound
);

/**
 * POST /api/scooters/unlock
 * request to unlock a scooter that is online, locked, and not being charged
 * @param vehicleCode
 * @return a new Ride object
 */
router.post(
  '/unlock',
  requireJWT,
  validate({ body: { vehicleCode: Joi.string().required() } }),
  ScooterController.unlockScooter
);

/**
 * POST /api/scooters/lock
 * request to lock a scooter which the user is currently ridings
 * @param scooterId
 * @param rideId
 * @return the updated Ride object
 */
router.post(
  '/lock',
  requireJWT,
  validate({ body: { scooterId: Joi.string().required(), rideId: Joi.string().required() } }),
  ScooterController.lockScooter
);

module.exports = router;
