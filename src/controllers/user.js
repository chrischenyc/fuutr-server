const httpStatus = require('http-status');
const _ = require('lodash');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const User = require('../models/user');
const Payment = require('../models/payment');
const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');
const { sendInvoiceEmail } = require('../helpers/send-email');
const { dateString } = require('../helpers/format-date');

exports.getProfile = async (req, res) => {
  const { userId: _id } = req;

  if (!_id) {
    res.status(httpStatus.UNAUTHORIZED);
    return;
  }

  const user = await User.findOne({ _id })
    .select({
      email: 1,
      phoneNumber: 1,
      countryCode: 1,
      displayName: 1,
      photo: 1,
      balance: 1,
    })
    .exec();

  if (!user) {
    res.status(httpStatus.UNAUTHORIZED).send();
    return;
  }

  res.json(user);
};

exports.updateProfile = async (req, res) => {
  const { userId: _id } = req;
  if (!_id) {
    res.status(httpStatus.UNAUTHORIZED);
  }

  const { displayName } = req.body;

  try {
    const user = await User.findOne({ _id }).exec();

    if (!user) {
      res.status(httpStatus.NO_CONTENT).send();
      return;
    }

    if (!_.isNil(displayName)) {
      user.displayName = displayName;
    }

    await user.save();
    res.status(httpStatus.OK).send();
  } catch (error) {
    logger.error(error.message);
    res.status(httpStatus.UNAUTHORIZED).send();
  }
};

exports.updateEmail = async (req, res, next) => {
  const { userId: _id } = req;
  if (!_id) {
    res.status(httpStatus.UNAUTHORIZED);
  }

  const { email } = req.body;

  try {
    const userWithSameEmail = await User.findOne({ email, _id: { $ne: _id } }).exec();

    if (userWithSameEmail) {
      next(new APIError('Email is taken', httpStatus.FORBIDDEN, true));
      return;
    }

    const user = await User.findOne({ _id }).exec();

    if (!user) {
      res.status(httpStatus.NO_CONTENT).send();
      return;
    }
    const { email: previousEmail } = user;
    // TODO: send email alert to previousEmail

    user.email = email;
    // TODO: send verification email to new email

    await user.save();

    res.status(httpStatus.OK).send();
  } catch (error) {
    logger.error(error.message);
    next(new APIError(`Couldn't update email to ${email}`, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.updatePhone = async (req, res, next) => {
  const { userId: _id } = req;
  const { phoneNumber, countryCode } = req.body;

  try {
    const userWithSamePhone = await User.findOne({
      phoneNumber,
      countryCode,
      _id: { $ne: _id },
    }).exec();

    if (userWithSamePhone) {
      next(APIError(`Phone number ${phoneNumber} is taken`, httpStatus.FORBIDDEN, true));
      return;
    }

    const user = await User.findOne({ _id }).exec();

    if (!user) {
      res.status(httpStatus.NO_CONTENT).send();
      return;
    }

    user.phoneNumber = phoneNumber;
    user.countryCode = countryCode;
    // TODO: send SMS to new number

    await user.save();

    res.status(httpStatus.OK).send();
  } catch (error) {
    logger.error(error.message);

    next(
      new APIError(
        `Couldn't update phone to ${phoneNumber}`,
        httpStatus.INTERNAL_SERVER_ERROR,
        true
      )
    );
  }
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
    const description = 'balance top up';
    const charge = await stripe.charges.create({
      source,
      amount,
      currency: 'aud',
      customer: user.stripeCustomerId,
      description,
      statement_descriptor: 'OTG Ride',
    });

    const dollarAmount = amount / 100.0;

    // update user balance
    user.balance += dollarAmount;
    await user.save();

    let lastFour = charge.source && charge.source.last4;
    const dynamicLastFour = charge.source && charge.source.dynamic_last4;
    const tokenizationMethod = charge.source && charge.source.tokenization_method;
    if (tokenizationMethod) {
      lastFour = `${dynamicLastFour} (${tokenizationMethod.replace('_', ' ')})`;
    }
    const payment = new Payment({
      stripeChargeId: charge.id,
      amount: dollarAmount,
      user: _id,
      lastFour,
      description,
    });
    await payment.save();

    if (user.email) {
      sendInvoiceEmail(
        user.email,
        charge.created,
        [{ name: description, price: dollarAmount }],
        dollarAmount,
        dateString(Date.now())
      );
    }

    res.status(httpStatus.OK).send();
  } catch (error) {
    logger.error(error.message);
    next(new APIError("Couldn't process your payment", httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.getHistoryPayments = async (req, res, next) => {
  try {
    const { userId } = req;
    const payments = await Payment.find({ user: userId })
      .select({
        amount: 1,
        lastFour: 1,
        description: 1,
        createdAt: 1,
      })
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    logger.error(error.message);

    next(
      new APIError(
        "Couldn't find history payments, please try again",
        httpStatus.INTERNAL_SERVER_ERROR,
        true
      )
    );
  }
};
