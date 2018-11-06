const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const router = express.Router();

const TwilioController = require('../controllers/twilio');
const UserController = require('../controllers/users');

// request a verification code to be sent to mobile number
router.post(
  '/phone/start-verification',
  validate({
    body: {
      phone_number: Joi.string().required(),
      country_code: Joi.number().required(),
    },
  }),
  TwilioController.startPhoneVerification
);

// verify the verification code with twilio
router.post(
  '/phone/signup',
  validate({
    body: {
      phone_number: Joi.string().required(),
      country_code: Joi.number().required(),
      verification_code: Joi.string().required(),
    },
  }),
  TwilioController.checkPhoneVerification,
  UserController.signupWithPhone
);

// email sign up
router.post(
  '/email/signup',
  validate({
    body: {
      email: Joi.string()
        .email()
        .required(),
      password: Joi.string()
        .regex(/^[a-zA-Z0-9]{6,30}$/)
        .required()
        .error(() => 'password should be at least...'),
    },
  }),
  UserController.signupWithEmail
);

// email log in
router.post(
  '/email/login',
  validate({
    body: {
      email: Joi.string()
        .email()
        .required(),
      password: Joi.string()
        .regex(/^[a-zA-Z0-9]{6,30}$/)
        .required()
        .error(() => 'password should be at least...'),
    },
  }),
  UserController.loginWithEmail
);

module.exports = router;
