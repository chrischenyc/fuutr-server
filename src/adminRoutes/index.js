const express = require('express');

const router = express.Router();

const auth = require('./auth');
const payments = require('./payments');
const rides = require('./rides');
const users = require('./users');
const transactions = require('./transactions');

router.use('/auth', auth);
router.use('/payments', payments);
router.use('/rides', rides);
router.use('/transactions', transactions);
router.use('/users', users);

module.exports = router;
