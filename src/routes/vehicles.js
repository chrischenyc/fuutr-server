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

/**
 * https://api.segway.pt/doc/index.html#api-Push-PushVehicleStatus
 * POST /vehicles/status
 * to receive periodic push updates from segway
 */
router.post(
  '/status',
  // FIXME: enable validation
  // validate({
  //   headers: {
  //     'content-type': 'application/x-www-form-urlencoded',
  //   },
  //   data: {
  //     vehicleCode: Joi.string().required(),
  //     iotCode: Joi.string().required(),
  //     signature: Joi.string().required(),
  //   },
  // }),
  VehicleController.updateVehicleStatus
);

module.exports = router;
