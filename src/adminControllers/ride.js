const httpStatus = require('http-status');
const polyline = require('@mapbox/polyline');

const Ride = require('../models/ride');
const User = require('../models/user');
const Scooter = require('../models/scooter');
const Transaction = require('../models/transaction');

const secondsBetweenDates = require('../helpers/seconds-between-dates');
const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');

exports.unlockScooter = async (req, res, next) => {
  const { vehicleCode, latitude, longitude } = req.body;
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
    const ride = new Ride({
      user: userId,
      scooter: scooter.id,
      vehicleCode,
      unlockCost: process.env.APP_UNLOCK_COST,
      minuteCost: process.env.APP_MINUTE_COST,
      totalCost: process.env.APP_UNLOCK_COST,
    });
    if (latitude && longitude) {
      // GeoJSON spec
      ride.unlockLocation = { type: 'Point', coordinates: [longitude, latitude] };
    }

    await ride.save();

    res.json(ride);
  } catch (error) {
    logger.error(error.message);
    next(new APIError("couldn't unlock scooter", httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

const updateRideWithIncrementalData = (ride, incrementalEncodedPath, incrementalDistance) => {
  if (incrementalDistance === 0) {
    return;
  }

  if (incrementalDistance) {
    ride.distance += incrementalDistance;
  }

  if (incrementalEncodedPath) {
    const coordinates = polyline
      .decode(incrementalEncodedPath)
      .map(coordinate => [coordinate[1], coordinate[0]]); // flip lat/lon to lon/lat

    if (ride.route) {
      ride.route = {
        type: 'LineString',
        coordinates: [...ride.route.coordinates, ...coordinates],
      };
    } else {
      ride.route = { type: 'LineString', coordinates };
    }

    ride.encodedPath = polyline.encode(
      ride.route.coordinates.map(coordinate => [coordinate[1], coordinate[0]])
    );
  }
};

exports.updateRide = async (req, res, next) => {
  const { _id } = req.params;
  const { incrementalEncodedPath, incrementalDistance } = req.body;
  const { userId } = req;

  try {
    const user = await User.findOne({ _id: userId }).exec();
    const ride = await Ride.findOne({ _id })
      .select({ route: 1, distance: 1 })
      .exec();

    if (!user || !ride) {
      next(new APIError("couldn't update ride", httpStatus.INTERNAL_SERVER_ERROR, true));
      return;
    }

    updateRideWithIncrementalData(ride, incrementalEncodedPath, incrementalDistance);

    await ride.save();

    res.status(httpStatus.OK).send();
  } catch (error) {
    logger.error(error.message);
    next(new APIError("couldn't update ride", httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.finishRide = async (req, res, next) => {
  const {
    latitude, longitude, incrementalEncodedPath, incrementalDistance,
  } = req.body;
  const { userId } = req;
  const { _id } = req.params;

  try {
    const user = await User.findOne({ _id: userId }).exec();
    const ride = await Ride.findOne({ _id }).exec();
    const scooter = await Scooter.findOne({ _id: ride.scooter }).exec();

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
    if (latitude && longitude) {
      // GeoJSON spec
      ride.lockLocation = { type: 'Point', coordinates: [longitude, latitude] };
    }

    updateRideWithIncrementalData(ride, incrementalEncodedPath, incrementalDistance);

    await ride.save();

    // update user balance
    user.balance -= ride.totalCost;
    await user.save();

    // create new transaction
    const transaction = new Transaction({
      user: userId,
      amount: -ride.totalCost,
      balance: user.balance,
      ride: ride._id,
      type: 'ride',
    });
    await transaction.save();

    res.json(ride);
  } catch (error) {
    logger.error(error.message);
    next(new APIError("couldn't unlock scooter", httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.pastRides = async (req, res, next) => {
  const { userId } = req;

  try {
    const rides = await Ride.find({ user: userId, completed: true }).sort({ unlockTime: -1 });

    res.json(rides);
  } catch (error) {
    logger.error(error.message);
    next(
      new APIError("couldn't retrieve your ride history", httpStatus.INTERNAL_SERVER_ERROR, true)
    );
  }
};

exports.getOngoingRide = async (req, res, next) => {
  const { userId } = req;

  try {
    const ride = await Ride.findOne({ user: userId, completed: false })
      .sort({ unlockTime: -1 })
      .exec();

    res.json(ride);
  } catch (error) {
    logger.error(error);
    next(new APIError("couldn't find current ride"));
  }
};
