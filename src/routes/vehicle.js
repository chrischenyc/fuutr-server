const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const router = express.Router();

const VehicleController = require('../controllers/vehicle');

/**
 * https://api.segway.pt/doc/index.html#api-Push-PushVehicleStatus
 * POST /vehicle/status
 * to receive periodic push updates from segway
 */
router.post(
  '/status',
  validate({
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    data: {
      vehicleCode: Joi.string().required(),
      iotCode: Joi.string().required(),
      signature: Joi.string().required(),
    },
  }),
  VehicleController.updateVehicleStatus
);

module.exports = router;
