const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const router = express.Router();

const { requireJWT } = require('../middleware/authenticate');
const VehicleController = require('../controllers/vehicle');

/**
 * GET /vehicles?latitude=&longitude=&radius=
 * search vehicles nearby
 */
router.get(
  '/',
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
      radius: Joi.number()
        .min(0)
        .required(),
    },
  }),
  VehicleController.searchVehicles
);

router.patch(
  '/:_id/reserve',
  requireJWT,
  validate({
    params: {
      _id: Joi.string().required(),
    },
    body: {
      reserve: Joi.bool().required(),
    },
  }),
  VehicleController.reserveVehicle
);

module.exports = router;
