const httpStatus = require('http-status');

const Transaction = require('../models/transaction');
const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');

exports.userTransactions = async (req, res, next) => {
  try {
    const { userId } = req;
    const transactions = await Transaction.find({ user: userId }).sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    logger.error(error.message);

    next(
      new APIError(
        "Couldn't find history transactions, please try again",
        httpStatus.INTERNAL_SERVER_ERROR,
        true
      )
    );
  }
};
