const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const router = express.Router();

const UserController = require('../controllers/user');
const PhoneController = require('../controllers/phone');
const { requireJWT } = require('../middleware/authenticate');
const { riderUpload } = require('../helpers/s3');

// fetch user info
router.get('/me', requireJWT, UserController.getProfile);

// PATCH /users/me
// update user info, such as displayName and avatar
router.patch(
  '/me',
  requireJWT,
  validate({
    body: {
      displayName: Joi.string().allow(''),
      oneSignalPlayerId: Joi.string().allow(''),
      applePushDeviceToken: Joi.string().allow(''),
    },
  }),
  riderUpload.single('image'),
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

module.exports = router;
