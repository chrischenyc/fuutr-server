const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');
const passport = require('passport');

const router = express.Router();

const PhoneController = require('../controllers/phone');
const AuthController = require('../controllers/auth');

const passwordSchema = Joi.string()
  .regex(/^(?=.*\d).{6,16}$/)
  .required()
  .error(
    () => 'password must be between 4-8 characters long and include at least one numeric digit.'
  );

const passwordResetCodeSchema = Joi.string()
  .regex(/^[0-9]{4}$/)
  .required()
  .error(() => 'Invalid password reset code.');

// verify phone code then sign up/in user
router.post(
  '/phone',
  validate({
    body: {
      phoneNumber: Joi.string().required(),
      countryCode: Joi.number().required(),
      verificationCode: Joi.string().required(),
    },
  }),
  PhoneController.checkVerificationCode,
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
      password: passwordSchema,
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

// request password reset verification code
router.get(
  '/reset-password-send-code',
  validate({
    query: {
      email: Joi.string()
        .email()
        .required(),
    },
  }),
  AuthController.sendPasswordResetCode
);

// verify password reset code
router.post(
  '/reset-password-verify-code',
  validate({
    body: {
      email: Joi.string()
        .email()
        .required(),
      code: passwordResetCodeSchema,
    },
  }),
  AuthController.verifyPasswordResetCode
);

// set new password
router.post(
  '/reset-password',
  validate({
    body: {
      email: Joi.string()
        .email()
        .required(),
      code: passwordResetCodeSchema,
      password: passwordSchema,
    },
  }),
  AuthController.resetPassword
);

module.exports = router;
