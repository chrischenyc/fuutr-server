const express = require('express');

const ZoneController = require('../controllers/zone');
const { requireJWT } = require('../middleware/authenticate');

const router = express.Router();

/**
 * GET /zones/
 */
router.get('/', requireJWT, ZoneController.getZones);

module.exports = router;
