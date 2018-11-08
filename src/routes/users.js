const express = require('express');

const router = express.Router();

const UserController = require('../controllers/users');
const Authenticate = require('../middleware/authenticate');

// fetch user profile
router.get('/me', Authenticate.validJWT, UserController.getProfile);

module.exports = router;
