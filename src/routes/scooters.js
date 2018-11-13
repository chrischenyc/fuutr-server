const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const router = express.Router();

const { requireJWT } = require('../middleware/authenticate');
const ScooterController = require('../controllers/scooter');

/**
 * GET /scooters/search-in-radius?latitude=&longitude=&radius=
 * search scooters nearby
 */
router.get(
  '/search-in-radius',
  requireJWT,
  validate({
    query: {
      latitude: Joi.number()
        .min(-90)
        .max(90)
        .required(),
      longitude: Joi.number()
        .min(-180)
        .max(180)
        .required(),
      radius: Joi.number().required(),
    },
  }),
  ScooterController.searchScootersInRadius
);

/**
 * GET /scooters/search-in-bound?minLatitude=&minLongitude=&maxLatitude=&maxLongitude=
 * search scooters nearby
 */
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

// /scooters/{id} GET - retrieve detail of a scooter

// /scooters/{id}/unlock POST - request to unlock a scooter

// /scooters/{id}/lock POST - request to lock a scooter

module.exports = router;
