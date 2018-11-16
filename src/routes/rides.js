const express = require('express');
const validate = require('express-validation');

const RideController = require('../controllers/ride');
const { requireJWT } = require('../middleware/authenticate');

const router = express.Router();

/**
 * GET /api/rides/current
 * find the latest unfinished ride of the user
 */
router.get('/current', requireJWT, RideController.getCurrentRide);

// /rides GET - list history rides

// /rides POST - create a new ride

// /rides/{id} GET - retrieve detail of a ride

// /rides/{id} PATCH - update a ride during riding

module.exports = router;
