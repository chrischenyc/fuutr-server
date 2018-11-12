const httpStatus = require('http-status');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const User = require('../models/user');
const RefreshToken = require('../models/refresh-token');
const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');
const {
  generateTokens,
  generateAccessToken,
  fourDigitsToken,
} = require('../helpers/token-generator');

const { sendWelcomeEmail, sendPasswordResetCodeEmail } = require('../helpers/send-email');

exports.signupWithPhone = (req, res, next) => {
  const { phoneNumber, countryCode } = req.body;

  // return matched User record or create a new one
  User.findOne({ phoneNumber, countryCode })
    .exec()
    .then((existingUser) => {
      if (existingUser) {
        return res.json(generateTokens(existingUser));
      }

      return stripe.customers.create({
        description: phoneNumber,
      });
    })
    .then((stripeCustomer) => {
      const newUser = new User({ phoneNumber, countryCode, stripeCustomerId: stripeCustomer.id });
      return newUser.save();
    })
    .then((newUser) => {
      res.status(httpStatus.CREATED).json(generateTokens(newUser));
    })
    .catch((error) => {
      logger.error(error);
      next(
        new APIError(
          `Couldn't sign up with mobile number ${phoneNumber}`,
          httpStatus.INTERNAL_SERVER_ERROR,
          true
        )
      );
    });
};

exports.signupWithEmail = (req, res, next) => {
  const { email, password } = req.body;
  let stripeCustomerId = null;

  User.findOne({ email })
    .exec()
    .then((existingUser) => {
      if (existingUser) {
        return next(new APIError('Email is taken', httpStatus.CONFLICT, true));
      }

      return stripe.customers.create({
        email,
      });
    })
    .then((stripeCustomer) => {
      stripeCustomerId = stripeCustomer.id;

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
      const newUser = new User({ email, password: hash, stripeCustomerId });
      sendWelcomeEmail(email);

      return newUser.save();
    })
    .then((newUser) => {
      // TODO: send out email verification email

      res.status(httpStatus.CREATED).json(generateTokens(newUser));
    })
    .catch((error) => {
      logger.error(error);
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
        res.json(generateTokens(user));
      } else {
        next(new APIError('wrong email or password', httpStatus.UNAUTHORIZED, true));
      }
    })
    .catch((error) => {
      logger.error(error);
      next(new APIError(`Cannot log in with email ${email}`, httpStatus.UNAUTHORIZED, true), true);
    });
};

exports.authWithFacebook = (req, res, next) => {
  const { user } = req;

  if (user) {
    res.json(generateTokens(user));
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

exports.refreshToken = (req, res) => {
  const { authorization } = req.headers;
  const { refreshToken } = req.body;

  const bearer = authorization && authorization.split(' ')[0];
  const token = authorization && authorization.split(' ')[1];

  if (bearer !== 'Bearer' || !token) {
    res.status(httpStatus.UNAUTHORIZED).send();
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true }, (err, decoded) => {
    if (!decoded || !decoded._id) {
      res.status(httpStatus.UNAUTHORIZED).send();
      return;
    }

    const { _id } = decoded;

    // validate refresh token
    RefreshToken.findOne({ token: refreshToken, userId: _id, expired: false })
      .exec()
      .then((validRefreshToken) => {
        if (validRefreshToken) {
          return User.findOne({ _id }).exec();
        }

        return res.status(httpStatus.UNAUTHORIZED).send();
      })
      .then((user) => {
        if (user) {
          return res.json(generateAccessToken(user));
        }

        return res.status(httpStatus.UNAUTHORIZED).send();
      })
      .catch(() => {
        res.status(httpStatus.UNAUTHORIZED).send();
      });
  });
};

exports.sendPasswordResetCode = async (req, res, next) => {
  const { email } = req.query;

  try {
    const user = await User.findOne({ email }).exec();
    if (!user) {
      throw Error('User not found');
    }

    const code = fourDigitsToken();
    const hashedToken = await bcrypt.hash(code, process.env.BCRYPT_SALT);
    user.passwordResetTokens.push({ hashedToken });
    await user.save();

    sendPasswordResetCodeEmail(email, code);

    res.status(httpStatus.OK).send();
  } catch (error) {
    logger.error(error);
    next(
      new APIError(
        `Couldn't send password reset code to ${email}`,
        httpStatus.INTERNAL_SERVER_ERROR,
        true
      )
    );
  }
};

exports.verifyPasswordResetCode = async (req, res, next) => {
  const { email, code } = req.body;

  try {
    const hashedToken = await bcrypt.hash(code, process.env.BCRYPT_SALT);

    const user = await User.findOne({
      email,
      'passwordResetTokens.hashedToken': { $in: hashedToken },
    }).exec();

    if (!user) {
      throw Error('User not found');
    }

    res.status(httpStatus.OK).send();
  } catch (error) {
    logger.error(error);
    next(
      new APIError(
        `Couldn't verify password reset code for ${email}`,
        httpStatus.INTERNAL_SERVER_ERROR,
        true
      )
    );
  }
};

exports.resetPassword = async (req, res, next) => {
  const { email, code, password } = req.body;

  try {
    const hashedToken = await bcrypt.hash(code, process.env.BCRYPT_SALT);

    const user = await User.findOne({
      email,
      'passwordResetTokens.hashedToken': { $in: hashedToken },
    }).exec();

    if (!user) {
      throw Error('User not found');
    }

    // update password hash
    // remove used verification code
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.passwordResetTokens = user.passwordResetTokens.filter(
      passwordResetToken => passwordResetToken.hashedToken !== hashedToken
    );
    await user.save();

    res.status(httpStatus.OK).send();
  } catch (error) {
    logger.error(error);
    next(
      new APIError(
        `Couldn't reset password reset code for ${email}`,
        httpStatus.INTERNAL_SERVER_ERROR,
        true
      )
    );
  }
};
