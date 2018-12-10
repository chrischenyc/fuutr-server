const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const router = express.Router();

const PaymentController = require('../adminControllers/payment');
const { requireJWT, requireAdmin } = require('../middleware/authenticate');

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
  PaymentController.getPayments
);

module.exports = router;
