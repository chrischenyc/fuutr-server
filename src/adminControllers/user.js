const httpStatus = require('http-status');
const _ = require('lodash');

const User = require('../models/user');
const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');
const { adminTablePaginationLimit } = require('../helpers/constants');

exports.getUsers = async (req, res, next) => {
  const { page, search } = req.query;

  try {
    let selector = {};
    if (!_.isEmpty(search)) {
      selector = {
        $or: [
          { displayName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phoneNumber: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const users = await User.find(selector)
      .select({
        isAdmin: 1,
        isCouncil: 1,
        displayName: 1,
        email: 1,
        countryCode: 1,
        phoneNumber: 1,
        balance: 1,
        createdAt: 1,
      })
      .limit(adminTablePaginationLimit)
      .skip(page * adminTablePaginationLimit)
      .sort({ _id: 1 });

    const total = await User.countDocuments({ selector });

    res.json({ users, pages: total / adminTablePaginationLimit });
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.getUser = async (req, res, next) => {
  const { _id } = req.params;

  try {
    const user = await User.findOne({ _id })
      .select({
        isAdmin: 1,
        isCouncil: 1,
        displayName: 1,
        email: 1,
        countryCode: 1,
        phoneNumber: 1,
        balance: 1,
        createdAt: 1,
        photo: 1,
      })
      .exec();

    res.json(user);
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
