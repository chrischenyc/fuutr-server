const express = require('express');
// const userRoutes = require('./server/user/user.route');
// const authRoutes = require('./server/auth/auth.route');

const router = express.Router(); // eslint-disable-line new-cap

/** GET /health-check - Check service health */
router.get('/health-check', (req, res) => res.send(`${process.env.NODE_ENV} server is OK`));

// mount user routes at /users
// router.use('/users', userRoutes);

// mount auth routes at /auth
// router.use('/auth', authRoutes);

module.exports = router;
