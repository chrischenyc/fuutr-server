const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const router = express.Router();
const IssueController = require('../controllers/issue');
const { requireJWT } = require('../middleware/authenticate');

/**
 * POST /issues
 */
router.post(
  '/',
  validate({
    data: {
      type: Joi.string().required(),
      description: Joi.string()
        .max(2500)
        .required(),
      latitude: Joi.number()
        .min(-90)
        .max(90)
        .required(),
      longitude: Joi.number()
        .min(-180)
        .max(180)
        .required(),
      vehicle: Joi.string().allow(''),
      ride: Joi.string().allow(''),
    },
  }),
  requireJWT,
  IssueController.addIssue
);

module.exports = router;
