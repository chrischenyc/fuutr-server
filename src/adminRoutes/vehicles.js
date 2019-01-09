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

/**
 * PATCH /admin/vehicles/:id
 */
router.patch(
  '/:_id',
  requireJWT,
  requireAdmin,
  validate({
    params: {
      _id: Joi.string().required(),
    },
    body: {
      vehicleCode: Joi.string().required(),
      iotCode: Joi.string().required(),
    },
  }),
  VehicleController.editVehicle
);

/**
 * PATCH /admin/vehicles/:id/lock
 */
router.patch(
  '/:_id/lock',
  requireJWT,
  requireAdmin,
  validate({
    params: {
      _id: Joi.string().required(),
    },
    body: {
      lock: Joi.bool().required(),
    },
  }),
  VehicleController.lockVehicle
);

/**
 * PATCH /admin/vehicles/:id/query
 */
router.patch(
  '/:_id/query',
  requireJWT,
  requireAdmin,
  validate({
    params: {
      _id: Joi.string().required(),
    },
  }),
  VehicleController.queryVehicle
);

module.exports = router;
