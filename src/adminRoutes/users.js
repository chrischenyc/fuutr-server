const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const router = express.Router();

const UserController = require('../adminControllers/user');
const { requireJWT, requireAdmin } = require('../middleware/authenticate');

// fetch users
router.get(
  '/',
  requireJWT,
  requireAdmin,
  validate({
    query: {
      page: Joi.number().required(),
      search: Joi.string().allow(''),
    },
  }),
  UserController.getUsers
);

module.exports = router;
