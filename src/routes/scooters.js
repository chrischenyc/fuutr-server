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

module.exports = router;
