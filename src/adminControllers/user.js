const httpStatus = require('http-status');

const User = require('../models/user');
const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');

const paginationLimit = 10;

exports.getUsers = async (req, res, next) => {
  const { page, search } = req.query;

  try {
    const users = await User.find({})
      .select({
        displayName: 1,
        email: 1,
        countryCode: 1,
        phoneNumber: 1,
        balance: 1,
        createdAt: 1,
      })
      .limit(paginationLimit)
      .skip(page * paginationLimit)
      .sort({ _id: 1 });

    const total = await User.count({});

    res.json({ users, pages: total / paginationLimit });
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
