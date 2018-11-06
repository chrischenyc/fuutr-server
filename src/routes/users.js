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
        .regex(/^(?=.*\d).{6,16}$/)
        .required()
        .error(
          () => 'password must be between 4-8 characters long and include at least one numeric digit.'
        ),
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
      password: Joi.string().required(),
    },
  }),
  UserController.loginWithEmail
);

module.exports = router;
