const httpStatus = require('http-status');
const polyline = require('@mapbox/polyline');
const SunCalc = require('suncalc');
const moment = require('moment');

const Ride = require('../models/ride');
const User = require('../models/user');
const Vehicle = require('../models/vehicle');
const Transaction = require('../models/transaction');
const Zone = require('../models/zone');

const secondsBetweenDates = require('../helpers/seconds-between-dates');
const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');
const { unlockVehicle, lockVehicle, headlight } = require('./segway');
const { addTimer, clearTimer } = require('../helpers/timer-manager');
const routeDistance = require('../helpers/route-distance');
const { s3ToCouldFront } = require('../helpers/s3');

exports.startRide = async (req, res, next) => {
  const { unlockCode } = req.body;
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
    const vehicle = await Vehicle.findOne({ unlockCode }).exec();

    if (!vehicle) {
      logger.error(`Start Ride: Unlock code ${unlockCode} not found`);
      next(
        new APIError(
          'Invalid unlock code, please try again',
          httpStatus.INTERNAL_SERVER_ERROR,
          true
        )
      );
      return;
    }
    if (!vehicle.online) {
      logger.error(`Start Ride: Vehicle ${vehicle._id} is offline`);
      next(
        new APIError(
          "Couldn't unlock this vehicle, it appears to be offline",
          httpStatus.INTERNAL_SERVER_ERROR,
          true
        )
      );
      return;
    }
    if (vehicle.charging) {
      logger.error(`Start Ride: Vehicle ${vehicle._id} is being charged`);
      next(
        new APIError(
          "Couldn't unlock this vehicle, it appears to be being charged at the moment",
          httpStatus.INTERNAL_SERVER_ERROR,
          true
        )
      );
      return;
    }
    if (!vehicle.locked) {
      logger.error(`Start Ride: Vehicle ${vehicle._id} is locked`);
      next(
        new APIError(
          "Couldn't unlock this vehicle, it appears to be unlocked already",
          httpStatus.INTERNAL_SERVER_ERROR,
          true
        )
      );
      return;
    }
    if (vehicle.inRide) {
      logger.error(`Start Ride: Vehicle ${vehicle._id} is during ride`);
      next(
        new APIError(
          "Couldn't unlock this vehicle, it appears to be in use at the moment",
          httpStatus.INTERNAL_SERVER_ERROR,
          true
        )
      );
      return;
    }
    if (vehicle.powerPercent < 10) {
      logger.error(`Start Ride: Vehicle ${vehicle._id} is low on battery`);
      next(
        new APIError(
          "Couldn't unlock this vehicle, its battery is running low",
          httpStatus.INTERNAL_SERVER_ERROR,
          true
        )
      );
      return;
    }
    if (vehicle.reserved && !vehicle.reservedBy.equals(userId)) {
      logger.error(`Start Ride: Vehicle ${vehicle._id} is being reserved`);

      next(
        new APIError(
          "Couldn't unlock this vehicle, it appears to be reserved by someone else",
          httpStatus.INTERNAL_SERVER_ERROR,
          true
        )
      );
      return;
    }

    // a flag to bypass actual IoT unlock/lock
    if (process.env.APP_VIRTUAL_VEHICLE_LOCK_UNLOCK !== 'true') {
      unlockVehicle(vehicle.iotCode, vehicle.vehicleCode);

      // turn on headlight before or after daylight time
      const now = new Date();
      const sunlightTimes = SunCalc.getTimes(
        now,
        vehicle.location.coordinates[1],
        vehicle.location.coordinates[0]
      );
      const halfHourAfterSunrise = moment(sunlightTimes.sunrise)
        .add(30, 'm')
        .toDate();
      const halfHourBeforeSunset = moment(sunlightTimes.sunset)
        .subtract(30, 'm')
        .toDate();

      if (now < halfHourAfterSunrise || now > halfHourBeforeSunset) {
        headlight(vehicle.iotCode, vehicle.vehicleCode, true);
      }

      logger.info(`Start Ride: Vehicle ${vehicle._id} unlocked by user ${userId}`);
    }

    // create Ride object
    // TODO: need to localise pricing

    const ride = new Ride({
      user: userId,
      vehicle: vehicle._id,
      unlockCode: `#${vehicle.unlockCode}`,
      unlockCost: parseFloat(process.env.APP_UNLOCK_COST_NZ),
      rideMinuteCost: parseFloat(process.env.APP_RIDE_MINUTE_COST_NZ),
      pauseMinuteCost: parseFloat(process.env.APP_PAUSE_MINUTE_COST_NZ),
      segments: [{ start: Date.now(), paused: false }],
      initialRemainingRange: vehicle.remainingRange,
      unlockLocation: vehicle.location,
    });

    await ride.save();

    vehicle.reserved = false;
    vehicle.reservedBy = undefined;
    vehicle.reserveTimeoutKey = undefined;
    vehicle.reservedUntil = undefined;
    vehicle.locked = false;
    vehicle.inRide = true;
    await vehicle.save(); // TODO: defer this DB operation

    const otherReservedVehicles = await Vehicle.find({ reserved: true, reservedBy: userId });
    otherReservedVehicles.forEach(async (otherReservedVehicle) => {
      otherReservedVehicle.reserved = false;
      otherReservedVehicle.reservedBy = undefined;
      otherReservedVehicle.reserveTimeoutKey = undefined;
      otherReservedVehicle.reservedUntil = undefined;

      otherReservedVehicle.save(); // TODO: defer this DB operation
    });

    res.json(ride);
  } catch (error) {
    logger.error(`Ride.start error: ${JSON.stringify(error)}`);
    next(new APIError("couldn't unlock scooter", httpStatus.INTERNAL_SERVER_ERROR, true));
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

    const vehicle = await Vehicle.findOne({ _id: ride.vehicle }).exec();

    // validate current locking position, geo-fence for illegal parking area
    const noParkingZones = await Zone.find({
      active: true,
      $or: [{ parking: false }, { riding: false }],
      polygon: {
        $geoIntersects: { $geometry: vehicle.location },
      },
    });
    if (noParkingZones.length > 0) {
      next(new APIError('no-parking', httpStatus.NOT_ACCEPTABLE, true));
      return;
    }

    if (process.env.APP_VIRTUAL_VEHICLE_LOCK_UNLOCK !== 'true') {
      const segwayResult = await lockVehicle(vehicle.iotCode, vehicle.vehicleCode);

      if (!segwayResult.success) {
        logger.error(`Segway API error: ${JSON.stringify(segwayResult)}`);

        next(new APIError("couldn't lock scooter", httpStatus.INTERNAL_SERVER_ERROR, true));

        return;
      }

      logger.info(`Pause Ride: Vehicle ${vehicle._id} locked by user ${userId}`);
    }

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
    logger.error(JSON.stringify(error));
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

    const vehicle = await Vehicle.findOne({ _id: ride.vehicle }).exec();

    if (process.env.APP_VIRTUAL_VEHICLE_LOCK_UNLOCK !== 'true') {
      const segwayResult = await unlockVehicle(vehicle.iotCode, vehicle.vehicleCode);

      if (!segwayResult.success) {
        logger.error(`Segway API error: ${JSON.stringify(segwayResult)}`);

        next(new APIError("couldn't unlock scooter", httpStatus.INTERNAL_SERVER_ERROR, true));

        return;
      }

      logger.info(`Resume Ride: Vehicle ${vehicle._id} unlocked by user ${userId}`);
    }

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
    logger.error(JSON.stringify(error));
    next(new APIError("couldn't update ride", httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

const finishRide = async (req, res, next) => {
  const { userId } = req;
  const { _id } = req.params;

  try {
    const user = await User.findOne({ _id: userId }).exec();
    const ride = await Ride.findOne({ _id, user: userId }).exec();
    const vehicle = await Vehicle.findOne({ _id: ride.vehicle }).exec();

    if (!user || !vehicle || !ride) {
      next(new APIError("couldn't lock scooter", httpStatus.INTERNAL_SERVER_ERROR, true));
      return;
    }

    // validate current locking position, geo-fence for illegal parking area
    const noParkingZones = await Zone.find({
      active: true,
      $or: [{ parking: false }, { riding: false }],
      polygon: {
        $geoIntersects: { $geometry: vehicle.location },
      },
    });
    if (noParkingZones.length > 0) {
      next(new APIError('no-parking', httpStatus.NOT_ACCEPTABLE, true));
      return;
    }

    // during development, we may not want to call segway IoT API to unlock the vehicle
    if (process.env.APP_VIRTUAL_VEHICLE_LOCK_UNLOCK !== 'true') {
      const segwayResult = await lockVehicle(vehicle.iotCode, vehicle.vehicleCode);

      if (!segwayResult.success) {
        logger.error(`Segway API error: ${JSON.stringify(segwayResult)}`);

        next(new APIError("couldn't lock scooter", httpStatus.INTERNAL_SERVER_ERROR, true));

        return;
      }

      headlight(vehicle.iotCode, vehicle.vehicleCode, false);

      logger.info(`Finish Ride: Vehicle ${vehicle._id} locked by user ${userId}`);
    }

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
    ride.lockLocation = vehicle.location;
    ride.duration = secondsBetweenDates(ride.unlockTime, ride.lockTime);
    ride.paused = false;
    ride.pausedUntil = undefined;
    ride.pauseTimeoutKey = undefined;
    ride.completed = true;

    // calculate total cost
    ride.totalCost = ride.unlockCost;
    ride.segments.forEach((segment) => {
      ride.totalCost += segment.cost;
    });

    // route
    if (ride.route) {
      ride.route = {
        type: 'LineString',
        coordinates: [...ride.route.coordinates, vehicle.location.coordinates],
      };

      ride.encodedPath = polyline.encode(
        ride.route.coordinates.map(coordinate => [coordinate[1], coordinate[0]])
      );

      // calculate distance
      ride.distance = routeDistance(ride.route.coordinates);
    }

    await ride.save();

    // TODO: defer other DB saving
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
    logger.error(`Ride.finish error: ${JSON.stringify(error)}`);
    next(new APIError("couldn't unlock scooter", httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.finishRide = finishRide;

exports.sendParkedPhoto = async (req, res, next) => {
  const { userId, file } = req;
  const { _id } = req.params;

  try {
    const ride = await Ride.findOne({
      _id,
      user: userId,
      completed: true,
      parkedPhoto: { $exists: false },
    }).exec();

    if (!ride || !file) {
      next(new APIError('Cannot upload parked photo', httpStatus.INTERNAL_SERVER_ERROR, true));
      return;
    }

    // update ride
    ride.parkedPhoto = s3ToCouldFront(
      file.location,
      process.env.AWS_S3_BUCKET_RIDER,
      process.env.AWS_S3_CLOUD_FRONT_RIDER
    );
    await ride.save();

    res.status(httpStatus.OK).send();
  } catch (error) {
    logger.error(`Ride.rate error: ${JSON.stringify(error)}`);
    next(new APIError("couldn't rate the ride", httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.rateRide = async (req, res, next) => {
  const { userId } = req;
  const { _id } = req.params;
  const { rating } = req.body;

  try {
    const ride = await Ride.findOne({
      _id,
      user: userId,
      completed: true,
      rating: { $exists: false },
    }).exec();

    if (!ride) {
      next(new APIError('Invalid request', httpStatus.INTERNAL_SERVER_ERROR, true));
      return;
    }

    // update ride
    ride.rating = rating;
    await ride.save();

    res.status(httpStatus.OK).send();
  } catch (error) {
    logger.error(`Ride.rate error: ${JSON.stringify(error)}`);
    next(new APIError("couldn't rate the ride", httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.pastRides = async (req, res, next) => {
  const { userId } = req;

  try {
    const rides = await Ride.find({ user: userId, completed: true }).sort({ unlockTime: -1 });

    res.json(rides);
  } catch (error) {
    logger.error(JSON.stringify(error));
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

exports.getRide = async (req, res, next) => {
  const { _id } = req.params;
  const { userId } = req;

  try {
    const ride = await Ride.findOne({ _id, user: userId }).exec();

    res.json(ride);
  } catch (error) {
    logger.error(JSON.stringify(error));
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
