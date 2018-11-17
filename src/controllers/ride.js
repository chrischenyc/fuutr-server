const httpStatus = require('http-status');

const Ride = require('../models/ride');
const User = require('../models/user');
const Scooter = require('../models/scooter');

const secondsBetweenDates = require('../helpers/seconds-between-dates');
const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');

exports.getOngoingRide = async (req, res, next) => {
  const { userId } = req;

  try {
    const ride = await Ride.findOne({ user: userId, completed: false })
      .sort({ unlockTime: -1 })
      .select({})
      .exec();

    res.json(ride);
  } catch (error) {
    logger.error(error);
    next(new APIError("couldn't find current ride"));
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

    if (!scooter) {
      next(new APIError("couldn't unlock scooter", httpStatus.INTERNAL_SERVER_ERROR, true));
      return;
    }

    // TODO: call Segway gateway https://api.segway.pt/doc/index.html#api-Control-VehicleUnlock

    // create Ride object
    // TODO: geo info
    const ride = new Ride({
      user: userId,
      scooter: scooter.id,
      vehicleCode,
      unlockCost: process.env.APP_UNLOCK_COST,
      minuteCost: process.env.APP_MINUTE_COST,
      totalCost: process.env.APP_UNLOCK_COST,
    });

    await ride.save();

    res.json(ride);
  } catch (error) {
    logger.error(error.message);
    next(new APIError("couldn't unlock scooter", httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.lockScooter = async (req, res, next) => {
  const { scooterId, rideId } = req.body;
  const { userId } = req;

  try {
    const user = await User.findOne({ _id: userId }).exec();
    const scooter = await Scooter.findOne({ _id: scooterId }).exec();
    const ride = await Ride.findOne({ _id: rideId }).exec();

    if (!user || !scooter || !ride) {
      next(new APIError("couldn't lock scooter", httpStatus.INTERNAL_SERVER_ERROR, true));
      return;
    }

    // TODO: Segway gateway https://api.segway.pt/doc/index.html#api-Control-VehicleLock
    // call to unlock scooter
    // call to refresh scooter stats

    // update scooter
    scooter.locked = true;
    await scooter.save();

    // update ride
    ride.lockTime = Date.now();
    ride.duration = secondsBetweenDates(ride.unlockTime, ride.lockTime);
    ride.completed = true;
    ride.totalCost = ride.unlockCost + ride.minuteCost * (ride.duration / 60.0);
    // TODO: geo info

    // TODO: create new transaction

    await ride.save();

    res.json(ride);
  } catch (error) {
    logger.error(error.message);
    next(new APIError("couldn't unlock scooter", httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
