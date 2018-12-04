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

exports.signupWithPhone = async (req, res, next) => {
  const { phoneNumber, countryCode } = req.body;

  try {
    // return matched User record or create a new one
    const existingUser = await User.findOne({ phoneNumber, countryCode }).exec();
    if (existingUser) {
      res.json(generateTokens(existingUser));
      return;
    }

    const stripeCustomer = await stripe.customers.create({
      description: phoneNumber,
    });

    const newUser = new User({ phoneNumber, countryCode, stripeCustomerId: stripeCustomer.id });
    await newUser.save();

    res.status(httpStatus.CREATED).json(generateTokens(newUser));
  } catch (error) {
    logger.error(error.message);
    next(
      new APIError(
        `Couldn't sign up with mobile number ${phoneNumber}`,
        httpStatus.INTERNAL_SERVER_ERROR,
        true
      )
    );
  }
};

exports.signupWithEmail = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email }).exec();
    if (existingUser) {
      next(new APIError('Email is taken', httpStatus.CONFLICT, true));
      return;
    }

    const stripeCustomer = await stripe.customers.create({ email });
    const hash = await bcrypt.hash(password, 10);

    const newUser = new User({ email, password: hash, stripeCustomerId: stripeCustomer.id });
    await newUser.save();

    // TODO: send out email verification email
    sendWelcomeEmail(email);

    res.status(httpStatus.CREATED).json(generateTokens(newUser));
  } catch (error) {
    logger.error(error.message);
    next(
      new APIError(`Cannot sign up with email ${email}`, httpStatus.INTERNAL_SERVER_ERROR, true)
    );
  }
};

exports.loginWithEmail = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email })
      .select({ password: 1 })
      .exec();

    if (!user) {
      next(new APIError('wrong email or password', httpStatus.UNAUTHORIZED, true));
      return;
    }

    const samePassword = await bcrypt.compare(password, user.password);
    if (!samePassword) {
      next(new APIError('wrong email or password', httpStatus.UNAUTHORIZED, true));
      return;
    }

    res.json(generateTokens(user));
  } catch (error) {
    logger.error(error.message);
    next(new APIError(`Cannot log in with email ${email}`, httpStatus.UNAUTHORIZED, true), true);
  }
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

exports.refreshToken = async (req, res) => {
  const { authorization } = req.headers;
  const { refreshToken } = req.body;

  const bearer = authorization && authorization.split(' ')[0];
  const token = authorization && authorization.split(' ')[1];

  if (bearer !== 'Bearer' || !token) {
    res.status(httpStatus.UNAUTHORIZED).send();
    return;
  }

  try {
    const decoded = await jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    const { _id } = decoded;
    if (!_id) {
      res.status(httpStatus.UNAUTHORIZED).send();
      return;
    }

    const validRefreshToken = await RefreshToken.findOne({
      token: refreshToken,
      user: _id,
      expired: false,
    }).exec();

    if (!validRefreshToken) {
      res.status(httpStatus.UNAUTHORIZED).send();
      return;
    }

    const user = await User.findOne({ _id }).exec();

    if (!user) {
      res.status(httpStatus.UNAUTHORIZED).send();
      return;
    }

    res.json(generateAccessToken(user));
  } catch (error) {
    logger.error(error.message);
    res.status(httpStatus.UNAUTHORIZED).send();
  }
};

exports.sendPasswordResetCode = async (req, res, next) => {
  const { email } = req.query;

  try {
    const user = await User.findOne({ email })
      .select({ passwordResetTokens: 1 })
      .exec();
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
    logger.error(error.message);
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
    logger.error(error.message);
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
    })
      .select({ passwordResetTokens: 1 })
      .exec();

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
    logger.error(error.message);
    next(
      new APIError(
        `Couldn't reset password reset code for ${email}`,
        httpStatus.INTERNAL_SERVER_ERROR,
        true
      )
    );
  }
};
