const express = require('express');

const router = express.Router();

const RemoteConfigController = require('../controllers/remoteConfig');

// fetch general configuration data
router.get('/', RemoteConfigController.getRemoteConfig);

module.exports = router;
