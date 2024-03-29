const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const router = express.Router();

const PaymentController = require('../adminControllers/payment');
const { requireJWT, requireAdmin } = require('../middleware/authenticate');

/**
 * GET /admin/payments/
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

// fetch payment detail
router.get(
  '/:_id',
  requireJWT,
  requireAdmin,
  validate({
    params: {
      _id: Joi.string().required(),
    },
  }),
  PaymentController.getPayment
);

module.exports = router;
