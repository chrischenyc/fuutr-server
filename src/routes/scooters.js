const express = require('express');

const router = express.Router();

const Scooter = require('../models/scooters');
const { databaseDebug } = require('../helpers/debug-loggers');

/**
 * Public routes to discover scooters
 */

// TODO: /scooters/{gps} GET - search scooters nearby
router.get('/', (req, res) => {
  Scooter.find()
    .exec()
    .then((scooters) => {
      res.json(scooters);
    })
    .catch((error) => {
      databaseDebug(error);
    });
});

// TODO: /scooters/{id} GET - retrieve detail of a scooter
router.get('/:id', (req, res) => {
  res.json({ message: 'not implemented' });
});

/**
 * Authenticated routes to discover scooters
 */

// TODO: /scooters/{id}/unlock POST - request to unlock a scooter

// TODO: /scooters/{id}/lock POST - request to lock a scooter

module.exports = router;
