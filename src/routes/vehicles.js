const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const router = express.Router();

const { requireJWT } = require('../middleware/authenticate');
const VehicleController = require('../controllers/vehicle');

/**
 * GET /vehicles?minLatitude=&minLongitude=&maxLatitude=&maxLongitude=
 * search vehicles nearby
 */
// TODO: replace with radius search
router.get(
  '/',
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
  VehicleController.searchVehicles
);

module.exports = router;
