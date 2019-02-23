const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const IssueController = require('../adminControllers/issue');
const { requireJWT, requireAdmin } = require('../middleware/authenticate');

const router = express.Router();

/**
 * GET /admin/issues/
 */
router.get(
  '/',
  requireJWT,
  requireAdmin,
  validate({
    query: {
      page: Joi.number().required(),
      user: Joi.strict(),
    },
  }),
  IssueController.getIssues
);

// fetch ride detail
router.get(
  '/:_id',
  requireJWT,
  requireAdmin,
  validate({
    params: {
      _id: Joi.string().required(),
    },
  }),
  IssueController.getIssue
);

module.exports = router;
