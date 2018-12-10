const express = require('express');
const validate = require('express-validation');
const Joi = require('joi');

const router = express.Router();

const TransactionController = require('../adminControllers/transaction');
const { requireJWT, requireAdmin } = require('../middleware/authenticate');

/**
 * GET /admin/transactions
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
  TransactionController.getTransactions
);

module.exports = router;
