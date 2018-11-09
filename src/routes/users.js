const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const router = express.Router();

const UserController = require('../controllers/users');
const Authenticate = require('../middleware/authenticate');

// fetch user info
router.get('/me', Authenticate.validJWT, UserController.getProfile);

// update user info, such as displayName and other non-critical info
router.patch(
  '/me',
  Authenticate.validJWT,
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
  Authenticate.validJWT,
  validate({
    body: {
      email: Joi.string()
        .email()
        .required(),
    },
  }),
  UserController.updateEmail
);

module.exports = router;
