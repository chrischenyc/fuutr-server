const httpStatus = require('http-status');
const bcrypt = require('bcrypt');

const User = require('../models/user');

const APIError = require('../helpers/api-error');

module.exports = {
  signupWithPhone: (req, res, next) => {
    const { phone_number, country_code } = req.body;

    // return matched User record or create a new one
    User.findOne({ phone_number, country_code })
      .exec()
      .then((user) => {
        if (user) {
          res.json(user.jwtToken);
        } else {
          const newUser = new User({ phone_number, country_code });
          newUser.save().then((result) => {
            res.status(httpStatus.CREATED).json(result.jwtToken);
          });
        }
      })
      .catch(() => {
        next(
          new APIError(
            `Couldn't sign up with mobile number +${country_code}${phone_number}`,
            httpStatus.INTERNAL_SERVER_ERROR,
            true
          )
        );
      });
  },

  signupWithEmail: (req, res, next) => {
    const { email, password } = req.body;

    User.findOne({ email })
      .exec()
      .then((user) => {
        if (user) {
          next(new APIError('Email is taken', httpStatus.CONFLICT, true));
        } else {
          bcrypt.hash(password, 10, (error, hash) => {
            if (error) {
              throw error;
            } else {
              const newUser = new User({ email, password: hash });
              newUser.save().then((result) => {
                res.status(httpStatus.CREATED).json(result.jwtToken);
              });
            }
          });
        }
      })
      .catch(() => {
        next(
          new APIError(`Cannot sign up with email ${email}`, httpStatus.INTERNAL_SERVER_ERROR, true)
        );
      });
  },

  loginWithEmail: (req, res, next) => {
    const { email, password } = req.body;

    User.findOne({ email })
      .exec()
      .then((user) => {
        if (user) {
          bcrypt.compare(password, user.password, (err, same) => {
            if (same) {
              res.json(user.jwtToken);
            } else {
              next(new APIError('wrong email or password', httpStatus.UNAUTHORIZED, true));
            }
          });
        } else {
          next(new APIError('wrong email or password', httpStatus.UNAUTHORIZED, true));
        }
      })
      .catch(() => {
        next(
          new APIError(`Cannot log in with email ${email}`, httpStatus.INTERNAL_SERVER_ERROR),
          true
        );
      });
  },
};
