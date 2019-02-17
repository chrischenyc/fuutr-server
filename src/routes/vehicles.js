const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const router = express.Router();

const { requireJWT } = require('../middleware/authenticate');
const VehicleController = require('../controllers/vehicle');

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

router.post(
  '/:_id/toot',
  requireJWT,
  validate({
    params: {
      _id: Joi.string().required(),
    },
  }),
  VehicleController.tootVehicle
);

module.exports = router;
