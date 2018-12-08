const express = require('express');

const router = express.Router();

const auth = require('./auth');
const payments = require('./payments');
const phones = require('./phones');
const users = require('./users');
const rides = require('./rides');
const scooters = require('./scooters');
const transactions = require('./transactions');

router.use('/auth', auth);
router.use('/payments', payments);
router.use('/phones', phones);
router.use('/rides', rides);
router.use('/scooters', scooters);
router.use('/users', users);
router.use('/transactions', transactions);

module.exports = router;
