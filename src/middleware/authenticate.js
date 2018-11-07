const jwt = require('jsonwebtoken');
const httpStatus = require('http-status');

const APIError = require('../helpers/api-error');

const User = require('../models/user');

// middleware that validate JWT token in request headers "Authorization"
module.exports = (req, res, next) => {
  const { authorization } = req.headers;
  const token = authorization && authorization.split(' ')[1];

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        next(new APIError('wrong token', httpStatus.UNAUTHORIZED));
      } else {
        const { _id } = decoded;
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
              req.user = user;
              next();
            } else {
              next(new APIError(`can't find user with _id ${_id}`, httpStatus.UNAUTHORIZED));
            }
          })
          .catch(() => {
            next(new APIError("can't query user", httpStatus.INTERNAL_SERVER_ERROR));
          });
      }
    });
  } else {
    next(new APIError('wrong token', httpStatus.UNAUTHORIZED));
  }
};
