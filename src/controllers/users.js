const httpStatus = require('http-status');
const bcrypt = require('bcrypt');

const User = require('../models/user');
const APIError = require('../helpers/api-error');

exports.signupWithPhone = (req, res, next) => {
  const { phoneNumber, countryCode } = req.body;

  // return matched User record or create a new one
  User.findOne({ phoneNumber, countryCode })
    .exec()
    .then((existingUser) => {
      if (existingUser) {
        return res.json(existingUser.jwtToken);
      }

      const newUser = new User({ phoneNumber, countryCode });
      return newUser.save();
    })
    .then((newUser) => {
      res.status(httpStatus.CREATED).json(newUser.jwtToken);
    })
    .catch(() => {
      res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send(`Couldn't sign up with mobile number +${countryCode}${phoneNumber}`);
    });
};

exports.signupWithEmail = (req, res, next) => {
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
};

exports.loginWithEmail = (req, res, next) => {
  const { email, password } = req.body;

  User.findOne({ email })
    .select({ password: 1 })
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
};

exports.authWithFacebook = (req, res, next) => {
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
};

exports.getProfile = (req, res, next) => {
  const { user } = req;

  if (user) {
    res.json(user);
  } else {
    res.status(httpStatus.UNAUTHORIZED);
  }
};
