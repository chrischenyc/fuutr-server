const express = require('express');

const router = express.Router();

const auth = require('./auth');
const payments = require('./payments');
const rides = require('./rides');
const users = require('./users');
const transactions = require('./transactions');
const vehicles = require('./vehicles');
const contacts = require('./contacts');
const zones = require('./zones');
const issues = require('./issues');

router.use('/auth', auth);
router.use('/payments', payments);
router.use('/rides', rides);
router.use('/transactions', transactions);
router.use('/users', users);
router.use('/vehicles', vehicles);
router.use('/contacts', contacts);
router.use('/zones', zones);
router.use('/issues', issues);

module.exports = router;
