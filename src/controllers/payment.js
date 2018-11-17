const httpStatus = require('http-status');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const User = require('../models/user');
const Payment = require('../models/payment');
const Transaction = require('../models/transaction');
const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');
const { sendInvoiceEmail } = require('../helpers/send-email');
const { dateString } = require('../helpers/format-date');

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

    const transaction = new Transaction({
      user: _id,
      amount: dollarAmount,
      payment: payment._id,
      type: 'top-up',
    });
    await transaction.save();

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
