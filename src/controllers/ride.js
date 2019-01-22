const httpStatus = require('http-status');
const polyline = require('@mapbox/polyline');

const Ride = require('../models/ride');
const User = require('../models/user');
const Vehicle = require('../models/vehicle');
const Transaction = require('../models/transaction');

const secondsBetweenDates = require('../helpers/seconds-between-dates');
const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');
const { unlockVehicle, lockVehicle } = require('./segway');
const { addTimer, clearTimer } = require('../helpers/timer-manager');

exports.unlockVehicle = async (req, res, next) => {
  const { unlockCode, latitude, longitude } = req.body;
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

    // find vehicle
    const vehicle = await Vehicle.findOne({
      unlockCode,
      online: true,
      locked: true,
      charging: false,
      inRide: false,
    })
      .select({
        reserved: 1,
        reservedBy: 1,
        iotCode: 1,
        vehicleCode: 1,
      })
      .exec();

    if (!vehicle) {
      logger.error(`Unlock code ${unlockCode} not found`);
      next(new APIError("couldn't unlock scooter", httpStatus.INTERNAL_SERVER_ERROR, true));
      return;
    }

    if (vehicle.reserved && !vehicle.reservedBy.equals(userId)) {
      logger.error(`Trying to unlock ${vehicle._id} which has been reserved by another user`);
      next(new APIError("couldn't unlock scooter", httpStatus.INTERNAL_SERVER_ERROR, true));
      return;
    }

    const segwayResult = await unlockVehicle(vehicle.iotCode, vehicle.vehicleCode);

    // if (!segwayResult.success) {
    //   logger.error(`Segway API error: ${segwayResult.message}`);

    //   next(new APIError("couldn't unlock scooter", httpStatus.INTERNAL_SERVER_ERROR, true));
    //   return;
    // }

    // update Vehicle object
    vehicle.reserved = false;
    vehicle.reservedBy = undefined;
    vehicle.reserveTimeoutKey = undefined;
    vehicle.reservedUntil = undefined;
    vehicle.locked = false;
    vehicle.inRide = true;
    await vehicle.save();

    // create Ride object
    const ride = new Ride({
      user: userId,
      vehicle: vehicle._id,
      unlockCost: process.env.APP_UNLOCK_COST,
      rideMinuteCost: process.env.APP_RIDE_MINUTE_COST,
      pauseMinuteCost: process.env.APP_PAUSE_MINUTE_COST,
      segments: [{ start: Date.now(), paused: false }],
    });

    if (latitude && longitude) {
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
    const ride = await Ride.findOne({ _id, user: userId }).exec();

    if (!ride) {
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

exports.pauseRide = async (req, res, next) => {
  const { _id } = req.params;
  const { userId } = req;

  try {
    const ride = await Ride.findOne({ _id, user: userId, paused: false }).exec();

    if (!ride) {
      next(new APIError("couldn't pause ride", httpStatus.INTERNAL_SERVER_ERROR, true));
      return;
    }

    const vehicle = await Vehicle.findOne({ _id: ride.vehicle })
      .select({ iotCode: 1, vehicleCode: 1 })
      .exec();

    // call to lock vehicle
    const segwayResult = await lockVehicle(vehicle.iotCode, vehicle.vehicleCode);

    // if (!segwayResult.success) {
    //   logger.error(`Segway API error: ${segwayResult.message}`);

    //   next(new APIError("couldn't lock scooter", httpStatus.INTERNAL_SERVER_ERROR, true));

    //   return;
    // }

    // update vehicle status
    const now = new Date();
    vehicle.locked = true;
    await vehicle.save();

    ride.paused = true;
    ride.pausedUntil = new Date(
      now.getTime() + parseInt(process.env.APP_RIDE_PAUSE_MAX_DURATION, 10) * 1000
    );

    // cancel previously scheduled job
    if (ride.pauseTimeoutKey) {
      clearTimer(ride.pauseTimeoutKey);
    }

    // schedule a delayed job to reset reserve state
    const timer = setTimeout(() => {
      finishRide(req, res);
    }, process.env.APP_RIDE_PAUSE_MAX_DURATION * 1000);

    ride.pauseTimeoutKey = addTimer(timer);

    // close current ride segment
    const lastSegment = ride.segments.pop();
    lastSegment.end = Date.now();
    lastSegment.cost = ride.rideMinuteCost * ((lastSegment.end - lastSegment.start) / 60000);
    ride.segments.push(lastSegment);
    // open a new paused segment
    const newSegment = {
      start: Date.now(),
      paused: true,
    };
    ride.segments.push(newSegment);

    await ride.save();

    res.json(ride);
  } catch (error) {
    logger.error(error.message);
    next(new APIError("couldn't update ride", httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.resumeRide = async (req, res, next) => {
  const { _id } = req.params;
  const { userId } = req;

  try {
    const ride = await Ride.findOne({ _id, user: userId, paused: true }).exec();

    if (!ride) {
      next(new APIError("couldn't resume ride", httpStatus.INTERNAL_SERVER_ERROR, true));
      return;
    }

    const vehicle = await Vehicle.findOne({ _id: ride.vehicle })
      .select({ iotCode: 1, vehicleCode: 1 })
      .exec();

    const segwayResult = await unlockVehicle(vehicle.iotCode, vehicle.vehicleCode);

    // if (!segwayResult.success) {
    //   logger.error(`Segway API error: ${segwayResult.message}`);

    //   next(new APIError("couldn't unlock scooter", httpStatus.INTERNAL_SERVER_ERROR, true));

    //   return;
    // }

    // update vehicle status
    vehicle.locked = false;
    await vehicle.save();

    // cancel previously scheduled job
    if (ride.pauseTimeoutKey) {
      clearTimer(ride.pauseTimeoutKey);
    }

    ride.paused = false;
    ride.pausedUntil = undefined;
    ride.pauseTimeoutKey = undefined;

    // close current paused segment
    const lastSegment = ride.segments.pop();
    lastSegment.end = Date.now();
    lastSegment.cost = ride.pauseMinuteCost * ((lastSegment.end - lastSegment.start) / 60000);
    ride.segments.push(lastSegment);
    // open a new ride segment
    const newSegment = {
      start: Date.now(),
      paused: false,
    };
    ride.segments.push(newSegment);

    await ride.save();

    res.json(ride);
  } catch (error) {
    logger.error(error.message);
    next(new APIError("couldn't update ride", httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

const finishRide = async (req, res, next) => {
  const {
    latitude, longitude, incrementalEncodedPath, incrementalDistance,
  } = req.body;
  const { userId } = req;
  const { _id } = req.params;

  try {
    const user = await User.findOne({ _id: userId }).exec();

    const ride = await Ride.findOne({ _id, user: userId }).exec();

    const vehicle = await Vehicle.findOne({ _id: ride.vehicle }).exec();

    if (!vehicle || !ride) {
      next(new APIError("couldn't lock scooter", httpStatus.INTERNAL_SERVER_ERROR, true));
      return;
    }

    // TODO: validate current locking position, geo-fence for illegal parking area

    // call to lock vehicle
    const segwayResult = await lockVehicle(vehicle.iotCode, vehicle.vehicleCode);

    // if (!segwayResult.success) {
    //   logger.error(`Segway API error: ${segwayResult.message}`);

    //   next(new APIError("couldn't lock scooter", httpStatus.INTERNAL_SERVER_ERROR, true));

    //   return;
    // }

    // update vehicle status
    vehicle.locked = true;
    vehicle.inRide = false;
    await vehicle.save();

    // close current ride segment
    const lastSegment = ride.segments.pop();
    lastSegment.end = Date.now();
    if (lastSegment.paused) {
      lastSegment.cost = ride.pauseMinuteCost * ((lastSegment.end - lastSegment.start) / 60000);
    } else {
      lastSegment.cost = ride.rideMinuteCost * ((lastSegment.end - lastSegment.start) / 60000);
    }
    ride.segments.push(lastSegment);

    // cancel previously scheduled job
    if (ride.pauseTimeoutKey) {
      clearTimer(ride.pauseTimeoutKey);
    }

    // update ride
    ride.lockTime = Date.now();
    if (latitude && longitude) {
      ride.lockLocation = { type: 'Point', coordinates: [longitude, latitude] };
    }
    ride.duration = secondsBetweenDates(ride.unlockTime, ride.lockTime);
    ride.paused = false;
    ride.pausedUntil = undefined;
    ride.pauseTimeoutKey = undefined;
    ride.completed = true;
    updateRideWithIncrementalData(ride, incrementalEncodedPath, incrementalDistance);

    // calculate total cost
    ride.totalCost = ride.unlockCost;
    ride.segments.forEach((segment) => {
      ride.totalCost += segment.cost;
    });

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

exports.finishRide = finishRide;

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
