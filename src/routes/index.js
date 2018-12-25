const express = require('express');

const router = express.Router();

const auth = require('./auth');
const payments = require('./payments');
const phones = require('./phones');
const users = require('./users');
const rides = require('./rides');
const vehicles = require('./vehicles');
const transactions = require('./transactions');

if (process.env.NODE_ENV !== 'production') {
  router.get('/health-check', (req, res) => res.json({ message: `${process.env.NODE_ENV} API server is up` }));
}

router.use('/auth', auth);
router.use('/payments', payments);
router.use('/phones', phones);
router.use('/rides', rides);
router.use('/vehicles', vehicles);
router.use('/users', users);
router.use('/transactions', transactions);

module.exports = router;
