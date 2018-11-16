const httpStatus = require('http-status');

const User = require('../models/user');
const Scooter = require('../models/scooter');
const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');

const { mockScootersInBound } = require('../helpers/mock-data');

// TODO: replace with mongodb $near query: https://docs.mongodb.com/manual/reference/operator/query/near/
exports.searchScootersInBound = async (req, res, next) => {
  const {
    minLatitude, minLongitude, maxLatitude, maxLongitude,
  } = req.query;

  try {
    const scooters = await Scooter.find({
      online: true,
      locked: true,
      charging: false,
      powerPercent: { $gt: 0 },
      latitude: { $gt: minLatitude, $lt: maxLatitude },
      longitude: { $gt: minLongitude, $lt: maxLongitude },
    }).select({
      iotCode: 1,
      vehicleCode: 1,
      powerPercent: 1,
      latitude: 1,
      longitude: 1,
      remainderRange: 1,
    });

    // FIXME: mock data!!!
    // res.json(scooters);
    res.json(mockScootersInBound(minLatitude, minLongitude, maxLatitude, maxLongitude));
  } catch (error) {
    logger.error(error.message);
    next(new APIError("couldn't find scooters", httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.unlockScooter = async (req, res, next) => {
  const { vehicleCode } = req.body;
  const { userId } = req;

  try {
    const user = await User.findOne({ _id: userId }).exec();

    // TODO: evaluate user balance

    // TODO: call Segway gateway

    // TODO: create Ride object

    res.json({ userId, vehicleCode, unlockedAt: Date.now() });
  } catch (error) {
    logger.error(error.message);
    next(new APIError("couldn't unlock scooter", httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
