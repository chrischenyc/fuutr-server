const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');
const passport = require('passport');

const router = express.Router();

const PhoneController = require('../controllers/phone');
const AuthController = require('../controllers/auth');

// verify the verification code with twilio
router.post(
  '/phone',
  validate({
    body: {
      phoneNumber: Joi.string().required(),
      countryCode: Joi.number().required(),
      verificationCode: Joi.string().required(),
    },
  }),
  PhoneController.checkPhoneVerification,
  AuthController.signupWithPhone
);

// email sign up
router.post(
  '/email-signup',
  validate({
    body: {
      email: Joi.string()
        .email()
        .required(),
      password: Joi.string()
        .regex(/^(?=.*\d).{6,16}$/)
        .required()
        .error(
          () => 'password must be between 4-8 characters long and include at least one numeric digit.'
        ),
    },
  }),
  AuthController.signupWithEmail
);

// email log in
router.post(
  '/email-login',
  validate({
    body: {
      email: Joi.string()
        .email()
        .required(),
      password: Joi.string().required(),
    },
  }),
  AuthController.loginWithEmail
);

// facebook log in
router.post(
  '/facebook',
  validate({
    body: {
      access_token: Joi.string()
        .required()
        .error(() => "couldn't finish your request"),
    },
  }),
  passport.authenticate('facebook-token', { session: false }),
  AuthController.authWithFacebook
);

// refresh token
router.post(
  '/token',
  validate({ body: { refreshToken: Joi.string().required() } }),
  AuthController.refreshToken
);

module.exports = router;
