const httpStatus = require('http-status');
const _ = require('lodash');

const Ride = require('../models/ride');

const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');
const { adminTablePaginationLimit } = require('../helpers/constants');

exports.getRides = async (req, res, next) => {
  const { user, vehicle, page } = req.query;

  try {
    let selector = {};

    if (!_.isEmpty(user)) {
      selector = { ...selector, user };
    }

    if (!_.isEmpty(vehicle)) {
      selector = { ...selector, vehicle };
    }

    const rides = await Ride.find(selector)
      .limit(adminTablePaginationLimit)
      .skip(page * adminTablePaginationLimit)
      .sort({ createdAt: -1 });

    const total = await Ride.countDocuments(selector);

    res.json({ rides, pages: Math.ceil(total / adminTablePaginationLimit) });
  } catch (error) {
    logger.error(JSON.stringify(error));
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.getRide = async (req, res, next) => {
  const { _id } = req.params;

  try {
    const ride = await Ride.findOne({ _id }).exec();

    res.json(ride);
  } catch (error) {
    logger.error(JSON.stringify(error));
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
