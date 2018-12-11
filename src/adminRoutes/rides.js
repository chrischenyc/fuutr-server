const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const RideController = require('../adminControllers/ride');
const { requireJWT, requireAdmin } = require('../middleware/authenticate');

const router = express.Router();

/**
 * GET /admin/rides/
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
  RideController.getRides
);

// fetch ride detail
router.get(
  '/:_id',
  requireJWT,
  requireAdmin,
  validate({
    params: {
      _id: Joi.string().required(),
    },
  }),
  RideController.getRide
);

module.exports = router;
