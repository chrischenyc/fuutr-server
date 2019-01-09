const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const router = express.Router();

const AuthController = require('../controllers/auth');

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
  (req, res, next) => {
    req.body.adminPortal = true;
    next();
  },
  AuthController.loginWithEmail
);

// refresh token
router.post(
  '/token',
  validate({ body: { refreshToken: Joi.string().required() } }),
  AuthController.refreshToken
);

module.exports = router;
