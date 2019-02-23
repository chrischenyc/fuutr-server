const httpStatus = require('http-status');
const _ = require('lodash');

const Issue = require('../models/issue');

const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');
const { adminTablePaginationLimit } = require('../helpers/constants');

exports.getIssues = async (req, res, next) => {
  const {
    user, vehicle, ride, page,
  } = req.query;

  try {
    let selector = {};

    if (!_.isEmpty(user)) {
      selector = { ...selector, user };
    }

    if (!_.isEmpty(vehicle)) {
      selector = { ...selector, vehicle };
    }

    if (!_.isEmpty(ride)) {
      selector = { ...selector, ride };
    }

    const issues = await Issue.find(selector)
      .limit(adminTablePaginationLimit)
      .skip(page * adminTablePaginationLimit)
      .sort({ createdAt: -1 });

    const total = await Issue.countDocuments(selector);

    res.json({ issues, pages: Math.ceil(total / adminTablePaginationLimit) });
  } catch (error) {
    logger.error(JSON.stringify(error));
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.getIssue = async (req, res, next) => {
  const { _id } = req.params;

  try {
    const issue = await Issue.findOne({ _id }).exec();

    res.json(issue);
  } catch (error) {
    logger.error(JSON.stringify(error));
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
