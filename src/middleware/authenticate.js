const jwt = require('jsonwebtoken');
const httpStatus = require('http-status');

const User = require('../models/user');
const logger = require('../helpers/logger');

// middleware that validate JWT token in request headers "Authorization"
exports.requireJWT = async (req, res, next) => {
  const { authorization } = req.headers;

  const bearer = authorization && authorization.split(' ')[0];
  const token = authorization && authorization.split(' ')[1];

  if (!bearer || bearer.toLowerCase() !== 'bearer' || !token) {
    res.status(httpStatus.UNAUTHORIZED).send();
    return;
  }

  try {
    const decoded = await jwt.verify(token, process.env.JWT_SECRET);

    const { _id } = decoded;

    if (!_id) {
      res.status(httpStatus.UNAUTHORIZED).send();
      return;
    }

    // inject userId into req
    req.userId = _id;
    next();
  } catch (error) {
    // access token expired: https://github.com/auth0/node-jsonwebtoken#tokenexpirederror
    if (error instanceof jwt.TokenExpiredError) {
      // respond with specific message so client knows to refresh token
      res.status(httpStatus.UNAUTHORIZED).json({ error: 'access token expired' });

      return;
    }

    res.status(httpStatus.UNAUTHORIZED).send();
  }
};

// middleware that validates user is an admin
exports.requireAdmin = async (req, res, next) => {
  const { userId: _id } = req;

  try {
    const user = await User.findOne({ _id, isAdmin: true }).exec();

    if (!user) {
      res.status(httpStatus.FORBIDDEN).send();
      return;
    }

    next();
  } catch (error) {
    logger.error(error.message);
  }
};
