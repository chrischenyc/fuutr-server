const express = require('express');

const router = express.Router();

const users = require('./users');
const paymentMethods = require('./payment-methods');
const rides = require('./rides');
const scooters = require('./scooters');

// FIXME: temp API to check service is up, remove in production deploy
router.get('/health-check', (req, res) => res.json({ message: `${process.env.NODE_ENV} API server is up ⬆` }));

router.use('/users', users);
router.use('/payment-methods', paymentMethods);
router.use('/rides', rides);
router.use('/scooters', scooters);

module.exports = router;
