const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const router = express.Router();

const PaymentController = require('../controllers/payment');
const { requireJWT } = require('../middleware/authenticate');

/**
 * POST /api/payments/me/stripe-ephemeral-keys
 *
 * Generate an ephemeral key for the logged in customer.
 * https://stripe.com/docs/mobile/ios/standard#prepare-your-api
 */
router.post(
  '/me/stripe-ephemeral-keys',
  requireJWT,
  validate({ body: { stripe_version: Joi.string().required() } }),
  PaymentController.generateStripeEphemeralKeys
);

/**
 * PUT /api/payments/me/top-up
 * top up user balance
 * @param amount
 * @param source - stripe payment source
 */
router.put(
  '/me/top-up',
  requireJWT,
  validate({ body: { amount: Joi.number().required(), source: Joi.string().required() } }),
  PaymentController.topUpBalance
);

/**
 * GET /api/payments/me
 * list history payments
 */
router.get('/me', requireJWT, PaymentController.getHistoryPayments);

module.exports = router;
