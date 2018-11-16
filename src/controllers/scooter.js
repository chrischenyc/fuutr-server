const httpStatus = require('http-status');

const User = require('../models/user');
const Scooter = require('../models/scooter');
const Ride = require('../models/ride');
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

    if (!user) {
      res.httpStatus(httpStatus.UNAUTHORIZED).send();
      return;
    }

    // evaluate user balance
    if (user.balance < process.env.APP_UNLOCK_MIN_BALANCE) {
      next(new APIError('insufficient balance', httpStatus.PAYMENT_REQUIRED, true));
      return;
    }

    // find scooter
    const scooter = await Scooter.findOne({
      vehicleCode: '2222', // FIXME: demo data
      online: true,
      locked: true,
      charging: false,
    }).exec();

    // TODO: call Segway gateway

    // create Ride object
    const ride = new Ride({
      user: userId,
      scooter: scooter.id,
      vehicleCode,
      unlockCost: process.env.APP_UNLOCK_COST,
      minuteCost: process.env.APP_MINUTE_COST,
      rideCost: 0.0,
      totalCost: process.env.APP_UNLOCK_COST,
    });

    await ride.save();

    // FIXME: omit unwanted fields!!!
    res.json(ride);
  } catch (error) {
    logger.error(error.message);
    next(new APIError("couldn't unlock scooter", httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
