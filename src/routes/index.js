const express = require('express');

const router = express.Router();

const auth = require('./auth');
const phone = require('./phone');
const users = require('./users');
const rides = require('./rides');
const scooters = require('./scooters');

if (process.env.NODE_ENV !== 'production') {
  router.get('/health-check', (req, res) => res.json({ message: `${process.env.NODE_ENV} API server is up ⬆` }));
}

router.use('/auth', auth);
router.use('/phone', phone);
router.use('/rides', rides);
router.use('/scooters', scooters);
router.use('/users', users);

module.exports = router;
