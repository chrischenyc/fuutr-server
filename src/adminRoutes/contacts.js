const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const ContactController = require('../adminControllers/contact');
const { requireJWT, requireAdmin } = require('../middleware/authenticate');

const router = express.Router();

/**
 * POST /admin/contacts
 */
router.post(
  '/',
  requireJWT,
  requireAdmin,
  validate({
    body: {
      name: Joi.string().required(),
      phone: Joi.string().required(),
      email: Joi.string()
        .email()
        .required(),
      message: Joi.string().required(),
    },
  }),
  ContactController.addContact
);

module.exports = router;
