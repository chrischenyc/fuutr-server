const httpStatus = require('http-status');
const _ = require('lodash');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const User = require('../models/user');
const Payment = require('../models/payment');
const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');

exports.getProfile = (req, res) => {
  const { userId: _id } = req;

  if (!_id) {
    res.status(httpStatus.UNAUTHORIZED);
    return;
  }

  User.findOne({ _id })
    .select({
      email: 1,
      phoneNumber: 1,
      countryCode: 1,
      displayName: 1,
      photo: 1,
      balance: 1,
    })
    .exec()
    .then(user => {
      if (user) {
        req.user = user;
        return res.json(user);
      }

      return res.status(httpStatus.UNAUTHORIZED).send();
    })
    .catch(() => {
      res.status(httpStatus.UNAUTHORIZED).send();
    });
};

exports.updateProfile = (req, res) => {
  const { userId: _id } = req;

  if (!_id) {
    res.status(httpStatus.UNAUTHORIZED);
  }

  const { displayName } = req.body;

  if (_.isNil(displayName)) {
    res.status(httpStatus.BAD_REQUEST).send();
  }

  User.findOne({ _id })
    .exec()
    .then(user => {
      if (user) {
        if (!_.isNil(displayName)) {
          user.displayName = displayName;
        }

        return user.save();
      }

      return res.status(httpStatus.NO_CONTENT).send();
    })
    .then(() => {
      res.status(httpStatus.OK).send();
    })
    .catch(() => {
      res.status(httpStatus.UNAUTHORIZED).send();
    });
};

exports.updateEmail = (req, res, next) => {
  const { userId: _id } = req;

  if (!_id) {
    res.status(httpStatus.UNAUTHORIZED);
  }

  const { email } = req.body;

  User.findOne({ email, _id: { $ne: _id } })
    .exec()
    .then(userWithSameEmail => {
      if (userWithSameEmail) {
        throw new APIError('Email is taken', httpStatus.FORBIDDEN, true);
      }

      return User.findOne({ _id }).exec();
    })
    .then(user => {
      if (user) {
        const { email: previousEmail } = user;
        // TODO: send email alert to previousEmail

        user.email = email;
        // TODO: send verification email to new email

        return user.save();
      }

      return res.status(httpStatus.NO_CONTENT).send();
    })
    .then(() => res.status(httpStatus.OK).send())
    .catch(error => {
      if (error instanceof APIError) {
        next(error);
      } else {
        logger.error(error);
        next(
          new APIError(`Couldn't update email to ${email}`, httpStatus.INTERNAL_SERVER_ERROR, true)
        );
      }
    });
};

exports.updatePhone = (req, res, next) => {
  const { userId: _id } = req;
  const { phoneNumber, countryCode } = req.body;

  User.findOne({ phoneNumber, countryCode, _id: { $ne: _id } })
    .exec()
    .then(userWithSamePhone => {
      if (userWithSamePhone) {
        throw new APIError(`Phone number ${phoneNumber} is taken`, httpStatus.FORBIDDEN, true);
      }

      return User.findOne({ _id }).exec();
    })
    .then(user => {
      if (user) {
        const { phoneNumber: previousPhoneNumber, countryCode: previousCountryCode } = user;
        // TODO: send SMS alert to previousPhoneNumber

        user.phoneNumber = phoneNumber;
        user.countryCode = countryCode;
        // TODO: send SMS to new number

        return user.save();
      }

      return res.status(httpStatus.NO_CONTENT).send();
    })
    .then(() => res.status(httpStatus.OK).send())
    .catch(error => {
      if (error instanceof APIError) {
        next(error);
      } else {
        logger.error(error);

        next(
          new APIError(
            `Couldn't update phone to ${phoneNumber}`,
            httpStatus.INTERNAL_SERVER_ERROR,
            true
          )
        );
      }
    });
};

exports.generateStripeEphemeralKeys = async (req, res, next) => {
  const { stripe_version } = req.body;
  const { userId: _id } = req;

  try {
    const user = await User.findOne({ _id }).exec();
    // Create ephemeral key for customer.
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: user.stripeCustomerId },
      { stripe_version }
    );

    // Respond with ephemeral key.
    res.send(ephemeralKey);
  } catch (err) {
    next(new APIError(err.message, httpStatus.INTERNAL_SERVER_ERROR));
  }
};

exports.topUpBalance = async (req, res, next) => {
  const { amount, source } = req.body;
  const { userId: _id } = req;

  try {
    const user = await User.findOne({ _id }).exec();

    // TODO: server-side amount validation

    // Create a charge and set its destination to the pilot's account.
    const description = 'OTG Ride balance top up';
    const charge = await stripe.charges.create({
      source: source,
      amount: amount,
      currency: 'aud',
      customer: user.stripeCustomerId,
      description,
      statement_descriptor: 'OTG Ride',
    });

    // update user balance
    user.balance += amount / 100.0;
    user.save();

    var lastFour = charge.source && charge.source.last4;
    var dynamicLastFour = charge.source && charge.source.dynamic_last4;
    const tokenizationMethod = charge.source && charge.source.tokenization_method;
    if (tokenizationMethod) {
      lastFour = `${dynamicLastFour} (${tokenizationMethod.replace('_', ' ')})`;
    }

    const payment = new Payment({
      stripeChargeId: charge.id,
      amount: amount / 100.0,
      userId: _id,
      lastFour,
      description,
    });
    payment.save();

    res.status(httpStatus.OK).send();
  } catch (error) {
    logger.error(error);
    next(new APIError("Couldn't process your payment", httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.getHistoryPayments = async (req, res, next) => {
  try {
    const { userId } = req;
    const payments = await Payment.find({ userId })
      .select({ amount: 1, lastFour: 1, description: 1, createdAt: 1 })
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    logger.error(error);

    next(
      new APIError(
        "Couldn't find history payments, please try again",
        httpStatus.INTERNAL_SERVER_ERROR,
        true
      )
    );
  }
};
