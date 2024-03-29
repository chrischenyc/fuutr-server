const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');
const passport = require('passport');

const router = express.Router();

const PhoneController = require('../controllers/phone');
const AuthController = require('../controllers/auth');
const { requireJWT } = require('../middleware/authenticate');

const passwordSchema = Joi.string()
  .regex(/^(?=.*\d).{6,16}$/)
  .required()
  .error(
    () => 'password must be between 4-8 characters long and include at least one numeric digit.'
  );

const optionalPasswordSchema = Joi.string()
  .allow('')
  .regex(/^(?=.*\d).{6,16}$/)
  .error(
    () => 'password must be between 4-8 characters long and include at least one numeric digit.'
  );

const verificationCodeSchema = Joi.string()
  .regex(/^[0-9]{6}$/)
  .required()
  .error(() => 'Invalid verification code.');

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
  AuthController.signInWithPhone
);

/**
 * POST /auth/email-verify
 *
 * @return { displayName: nullable } if email is registered
 */
router.post(
  '/email-verify',
  validate({
    body: {
      email: Joi.string()
        .email()
        .required(),
    },
  }),
  AuthController.verifyEmail
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
/**
 * @param isAdmin login to admin portal?
 */
router.post(
  '/email-login',
  validate({
    body: {
      email: Joi.string()
        .email()
        .required(),
      password: Joi.string().required(),
      isAdmin: Joi.bool(),
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

// POST /auth/logout
router.post(
  '/logout',
  validate({ body: { refreshToken: Joi.string().required() } }),
  AuthController.logout
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
      code: verificationCodeSchema,
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
      code: verificationCodeSchema,
      password: passwordSchema,
    },
  }),
  AuthController.resetPassword
);

// POST /auth/update-password
router.post(
  '/update-password',
  validate({
    body: {
      currentPassword: optionalPasswordSchema,
      newPassword: passwordSchema,
    },
  }),
  requireJWT,
  AuthController.updatePassword
);

// GET /auth/update-email
// request update email verification code
router.get(
  '/update-email',
  validate({
    query: {
      email: Joi.string()
        .email()
        .required(),
    },
  }),
  requireJWT,
  AuthController.requestUpdateEmail
);

// POST /auth/update-email
// verify update email code and set the new email if validated
router.post(
  '/update-email',
  validate({
    body: {
      email: Joi.string()
        .email()
        .required(),
      code: verificationCodeSchema,
    },
  }),
  requireJWT,
  AuthController.updateEmail
);

module.exports = router;
