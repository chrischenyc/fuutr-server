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
      .then((existingUser) => {
        if (existingUser) {
          return res.json(existingUser.jwtToken);
        }

        const newUser = new User({ phone_number, country_code });
        return newUser.save();
      })
      .then((newUser) => {
        res.status(httpStatus.CREATED).json(newUser.jwtToken);
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
      .then((existingUser) => {
        if (existingUser) {
          return next(new APIError('Email is taken', httpStatus.CONFLICT, true));
        }

        // hash password
        return new Promise((resolve, reject) => {
          bcrypt.hash(password, 10, (error, hash) => {
            if (error) {
              reject(error);
            } else {
              resolve(hash);
            }
          });
        });
      })
      .then((hash) => {
        const newUser = new User({ email, password: hash });
        return newUser.save();
      })
      .then((newUser) => {
        // TODO: send out email verification email

        res.status(httpStatus.CREATED).json(newUser.jwtToken);
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
          return new Promise((resolve, reject) => {
            bcrypt.compare(password, user.password, (err, samePassword) => {
              if (err) {
                reject(err);
              } else {
                resolve({ user, samePassword });
              }
            });
          });
        }

        return next(new APIError('wrong email or password', httpStatus.UNAUTHORIZED, true));
      })
      .then(({ user, samePassword }) => {
        if (samePassword) {
          res.json(user.jwtToken);
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

  authWithFacebook: (req, res, next) => {
    const { user } = req;

    if (user) {
      res.json(user.jwtToken);
    } else {
      next(
        new APIError(
          "Couldn't sign in with Facebook, please try other methods",
          httpStatus.UNAUTHORIZED,
          true
        )
      );
    }
  },
};
