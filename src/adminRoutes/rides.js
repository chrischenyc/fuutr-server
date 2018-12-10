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
      search: Joi.string().allow(''),
      user: Joi.strict(),
    },
  }),
  RideController.getRides
);

module.exports = router;
