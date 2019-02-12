const express = require('express');

const router = express.Router();

const remoteConfig = require('./remoteConfig');
const auth = require('./auth');
const payments = require('./payments');
const phones = require('./phones');
const users = require('./users');
const rides = require('./rides');
const vehicles = require('./vehicles');
const vehicle = require('./vehicle');
const transactions = require('./transactions');
const search = require('./search');

router.use('/remoteConfig', remoteConfig);
router.use('/auth', auth);
router.use('/payments', payments);
router.use('/phones', phones);
router.use('/rides', rides);
router.use('/vehicles', vehicles);
router.use('/vehicle', vehicle);
router.use('/users', users);
router.use('/transactions', transactions);
router.use('/search', search);

module.exports = router;
