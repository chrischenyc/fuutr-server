const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const VehicleController = require('../adminControllers/vehicle');
const { requireJWT, requireAdmin } = require('../middleware/authenticate');

const router = express.Router();

/**
 * GET /admin/vehicles/
 */
router.get(
  '/',
  requireJWT,
  requireAdmin,
  validate({
    query: {
      page: Joi.number().required(),
      user: Joi.strict(),
    },
  }),
  VehicleController.getVehicles
);

/**
 * GET /admin/vehicles/:id
 */
router.get(
  '/:_id',
  requireJWT,
  requireAdmin,
  validate({
    params: {
      _id: Joi.string().required(),
    },
  }),
  VehicleController.getVehicle
);

/**
 * POST /admin/vehicles
 */
router.post(
  '/',
  requireJWT,
  requireAdmin,
  validate({
    body: {
      vehicleCode: Joi.string().required(),
      iotCode: Joi.string().required(),
    },
  }),
  VehicleController.addVehicle
);

module.exports = router;
