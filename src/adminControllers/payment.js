const httpStatus = require('http-status');
const _ = require('lodash');

const Payment = require('../models/payment');
const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');
const { adminTablePaginationLimit } = require('../helpers/constants');

exports.getPayments = async (req, res, next) => {
  const { user, page } = req.query;

  try {
    let selector = {};

    if (!_.isEmpty(user)) {
      selector = { ...selector, user };
    }

    const payments = await Payment.find(selector)
      .limit(adminTablePaginationLimit)
      .skip(page * adminTablePaginationLimit)
      .sort({ createdAt: -1 });

    const total = await Payment.countDocuments(selector);

    res.json({ payments, pages: Math.ceil(total / adminTablePaginationLimit) });
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.getPayment = async (req, res, next) => {
  const { _id } = req.params;

  try {
    const payment = await Payment.findOne({ _id }).exec();

    res.json(payment);
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
