const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const router = express.Router();

const UserController = require('../controllers/user');
const PhoneController = require('../controllers/phone');
const { requireJWT } = require('../middleware/authenticate');

// fetch user info
router.get('/me', requireJWT, UserController.getProfile);

// update user info, such as displayName and other non-critical info
router.patch(
  '/me',
  requireJWT,
  validate({
    body: {
      email: Joi.string().email(),
      displayName: Joi.string().allow(''),
    },
  }),
  UserController.updateProfile
);

// update user email
router.put(
  '/me/email',
  requireJWT,
  validate({
    body: {
      email: Joi.string()
        .email()
        .required(),
    },
  }),
  UserController.updateEmail
);

// update user phone number
router.put(
  '/me/phone',
  requireJWT,
  validate({
    body: {
      phoneNumber: Joi.string().required(),
      countryCode: Joi.number().required(),
      verificationCode: Joi.string().required(),
    },
  }),
  PhoneController.checkVerificationCode,
  UserController.updatePhone
);

/**
 * POST /api/users/me/stripe-ephemeral-keys
 *
 * Generate an ephemeral key for the logged in customer.
 * https://stripe.com/docs/mobile/ios/standard#prepare-your-api
 */
router.post(
  '/me/stripe-ephemeral-keys',
  requireJWT,
  validate({ body: { stripe_version: Joi.string().required() } }),
  UserController.generateStripeEphemeralKeys
);

router.put(
  '/me/balance',
  requireJWT,
  validate({ body: { amount: Joi.number().required(), source: Joi.string().required() } }),
  UserController.topUpBalance
);

router.get('/me/payments', requireJWT, UserController.getHistoryPayments);

module.exports = router;
