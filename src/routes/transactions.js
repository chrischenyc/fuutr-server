const express = require('express');

const router = express.Router();

const TransactionController = require('../controllers/transaction');
const { requireJWT } = require('../middleware/authenticate');

/**
 * GET /api/transactions/me
 * list history transactions of current user
 */
router.get('/me', requireJWT, TransactionController.userTransactions);

module.exports = router;
