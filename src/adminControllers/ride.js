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
      .select({
        user: 1,
        vehicle: 1,
        duration: 1,
        distance: 1,
        completed: 1,
        totalCost: 1,
        createdAt: 1,
      })
      .limit(adminTablePaginationLimit)
      .skip(page * adminTablePaginationLimit)
      .sort({ createdAt: -1 });

    const total = await Ride.countDocuments(selector);

    res.json({ rides, pages: Math.ceil(total / adminTablePaginationLimit) });
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.getRide = async (req, res, next) => {
  const { _id } = req.params;

  try {
    const ride = await Ride.findOne({ _id })
      .select({
        user: 1,
        vehicle: 1,
        unlockTime: 1,
        lockTime: 1,
        unlockLocation: 1,
        lockLocation: 1,
        route: 1,
        encodedPath: 1,
        duration: 1,
        distance: 1,
        completed: 1,
        unlockCost: 1,
        minuteCost: 1,
        totalCost: 1,
      })
      .exec();

    res.json(ride);
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
