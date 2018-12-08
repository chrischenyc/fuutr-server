const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const router = express.Router();

const UserController = require('../adminControllers/user');
const { requireJWT } = require('../middleware/authenticate');

// fetch users
router.get(
  '/',
  // requireJWT,
  validate({
    query: {
      page: Joi.number().required(),
      search: Joi.string().allow(''),
    },
  }),
  UserController.getUsers
);

module.exports = router;
