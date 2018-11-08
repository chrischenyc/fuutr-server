const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const router = express.Router();

const PhoneController = require('../controllers/phone');

// request a verification code to be sent to mobile number
router.post(
  '/start-verification',
  validate({
    body: {
      phoneNumber: Joi.string().required(),
      countryCode: Joi.number().required(),
    },
  }),
  PhoneController.startPhoneVerification
);

module.exports = router;
