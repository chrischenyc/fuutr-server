const jwt = require('jsonwebtoken');
const httpStatus = require('http-status');

const User = require('../models/user');

// middleware that validate JWT token in request headers "Authorization"
exports.validJWT = (req, res, next) => {
  const { authorization } = req.headers;

  const bearer = authorization && authorization.split(' ')[0];
  const token = authorization && authorization.split(' ')[1];

  if (bearer !== 'Bearer' || !token) {
    res.status(httpStatus.UNAUTHORIZED).send();
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    const { _id } = decoded;

    if (err || !_id) {
      res.status(httpStatus.UNAUTHORIZED).send();
      return;
    }

    User.findOne({ _id })
      .select({
        email: 1,
        phoneNumber: 1,
        countryCode: 1,
        displayName: 1,
        photo: 1,
      })
      .exec()
      .then((user) => {
        if (user) {
          // inject found User record in request as .user
          req.user = user;
          next();
        } else {
          res.status(httpStatus.UNAUTHORIZED).send();
        }
      })
      .catch(() => {
        res.status(httpStatus.UNAUTHORIZED).send();
      });
  });
};
