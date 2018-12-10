const httpStatus = require('http-status');
const _ = require('lodash');

const Ride = require('../models/ride');

const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');

const paginationLimit = 5;

exports.getRides = async (req, res, next) => {
  const { user, page, search } = req.query;

  try {
    let selector = {};
    if (!_.isEmpty(search)) {
      selector = {
        $or: [{ createdAt: { $regex: search, $options: 'i' } }],
      };
    }

    if (!_.isEmpty(user)) {
      selector = { ...selector, user };
    }

    const rides = await Ride.find(selector)
      .select({
        user: 1,
        scooter: 1,
        duration: 1,
        distance: 1,
        completed: 1,
        totalCost: 1,
        createdAt: 1,
      })
      .limit(paginationLimit)
      .skip(page * paginationLimit)
      .sort({ createdAt: -1 });

    const total = await Ride.countDocuments(selector);

    res.json({ rides, pages: Math.ceil(total / paginationLimit) });
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
