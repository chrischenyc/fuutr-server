const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const ZoneController = require('../adminControllers/zone');
const { requireJWT, requireAdmin } = require('../middleware/authenticate');

const router = express.Router();

/**
 * GET /admin/zones/
 */
router.get(
  '/',
  requireJWT,
  requireAdmin,
  validate({
    query: {
      page: Joi.number().required(),
    },
  }),
  ZoneController.getZones
);

/**
 * POST /admin/zones
 */
/*
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
  ZoneController.addVehicle
);
*/

/**
 * PATCH /admin/vehicles/:id
 */
/*
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
  ZoneController.editVehicle
);
*/

module.exports = router;
