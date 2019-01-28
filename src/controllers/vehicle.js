const httpStatus = require('http-status');
const _ = require('lodash');
const md5 = require('md5');
const moment = require('moment');
const axios = require('axios');

const Vehicle = require('../models/vehicle');
const User = require('../models/user');
const Zone = require('../models/zone');
const Ride = require('../models/ride');

const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');

const updateVehicleStatus = require('../helpers/update-vehicle-status');
const { addTimer, clearTimer } = require('../helpers/timer-manager');
const { updateVehicleSpeedMode } = require('./segway');

// convert mongo document object to an object to be returned
const normalizeVehicleResult = (vehicle, user) => {
  let result = {
    _id: vehicle._id,
    powerPercent: vehicle.powerPercent,
    remainderRange: vehicle.remainderRange * 10.0,
    vehicleCode: `xxxx-${vehicle.vehicleCode.slice(-4)}`,
    longitude: vehicle.location.coordinates[0],
    latitude: vehicle.location.coordinates[1],
    address: vehicle.address,
    reserved: vehicle.reserved,
    locked: vehicle.locked,
    inRide: vehicle.inRide,
    unlockCost: parseFloat(process.env.APP_UNLOCK_COST),
    rideMinuteCost: parseFloat(process.env.APP_RIDE_MINUTE_COST),
    pauseMinuteCost: parseFloat(process.env.APP_PAUSE_MINUTE_COST),
  };

  if (vehicle.reservedUntil) {
    result = { ...result, reservedUntil: vehicle.reservedUntil };
  }

  if (user.canReserveVehicleAfter && user.canReserveVehicleAfter > Date.now()) {
    result = { ...result, canReserveAfter: user.canReserveVehicleAfter };
  }

  return result;
};

exports.searchVehicles = async (req, res, next) => {
  const { latitude, longitude, radius } = req.query;
  const { userId } = req;

  try {
    const user = await User.findOne({ _id: userId }).exec();

    // TODO: move returning reserved vehicle to vehicle reserve API response
    // if a vehicle is being reserved by current user, return just that one
    let vehicles = await Vehicle.find({
      reserved: true,
      reservedBy: userId,
    });

    // TODO: move returning vehicle in a paused ride to ride pause API response
    // TODO: if the vehicle is in a ride by current user and is paused, return just that one
    if (vehicles.length === 0) {
      const ride = await Ride.findOne({ user: userId, paused: true, completed: false }).exec();
      if (ride) {
        vehicles = await Vehicle.find({ _id: ride.vehicle });
      }
    }

    // otherwise, return all nearby vehicles
    if (vehicles.length === 0) {
      vehicles = await Vehicle.find({
        online: true,
        locked: true,
        inRide: false,
        charging: false,
        reserved: false,
        location: {
          $nearSphere: {
            $geometry: { type: 'Point', coordinates: [longitude, latitude] },
            $maxDistance: radius,
          },
        },
      });
    }

    vehicles = vehicles.map(vehicle => normalizeVehicleResult(vehicle, user));

    res.json(vehicles);
  } catch (error) {
    logger.error(error.message);
    next(new APIError("couldn't find scooters", httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

const validateSegwayPushBody = (body) => {
  const { signature } = body;

  const sortedKeys = Object.keys(_.omit(body, 'signature')).sort();
  const keyValues = sortedKeys.map(key => `${key}=${body[key]}`);
  keyValues.push(`client_secret=${process.env.SEGWAY_CLIENT_SECRET}`);

  const rawString = keyValues.join('&');

  const encryptedString = md5(rawString);

  return signature === encryptedString;
};

exports.receiveVehicleStatusPush = async (req, res, next) => {
  try {
    // validate signature
    if (!validateSegwayPushBody(req.body)) {
      res.status(httpStatus.BAD_REQUEST).send();
      return;
    }

    const { vehicleCode, iotCode } = req.body;

    const vehicle = await Vehicle.findOne({
      vehicleCode,
      iotCode,
    }).exec();

    if (!vehicle) {
      res.status(httpStatus.INTERNAL_SERVER_ERROR).send();
      return;
    }

    const { location: previousLocation, address: previousAddress } = vehicle;

    const updatedVehicle = await updateVehicleStatus(vehicleCode, iotCode, req.body);
    logger.info(
      `Segway push: status updated vehicle ${
        vehicle._id
      } iotCode ${iotCode} vehicleCode ${vehicleCode}`
    );

    const { locked, location, speedMode } = updatedVehicle;

    // geo-fenced speed limit
    if (!locked) {
      const speedLimitZones = await Zone.find({
        active: true,
        speedMode: { $in: [1, 2] },
        polygon: {
          $geoIntersects: { $geometry: location },
        },
      }).sort({ speedMode: 1 });

      let newSpeedMode = speedMode;

      if (speedLimitZones.length > 0) {
        newSpeedMode = speedLimitZones[0].speedMode;
      } else {
        newSpeedMode = 3;
      }

      if (speedMode !== newSpeedMode) {
        logger.info(`Speed limit zone: update vehicle speed mode to ${newSpeedMode}`);

        const segwayResult = await updateVehicleSpeedMode(iotCode, vehicleCode, newSpeedMode);
        if (!segwayResult.success) {
          logger.error(`Segway API error, can't update speed mode: ${segwayResult}`);
        }
      }
    }

    // reverse-geo query for locked vehicle's new address
    if (
      locked
      && previousLocation
      && location
      && (!_.isEqual(previousLocation, location) || _.isNil(previousAddress))
    ) {
      logger.info(`should update vehicle address ${updatedVehicle._id}`);

      // reverse location into address
      // https://developers.google.com/maps/documentation/geocoding/intro
      axios
        .get(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.coordinates[1]},${
            location.coordinates[0]
          }&key=${process.env.GOOGLE_MAPS_API_KEY}&language=en-Au`
        )
        .then((response) => {
          if (
            response
            && response.data
            && response.data.results
            && response.data.results.length > 0
          ) {
            const { formatted_address } = response.data.results[0];

            logger.info(formatted_address);
          }
        })
        .catch((error) => {
          logger.error(error);
        });

      // TODO: save to database
    }

    res.status(httpStatus.OK).send();
  } catch (error) {
    logger.error(`Segway push error: ${error.message}`);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send();
  }
};

exports.reserveVehicle = async (req, res, next) => {
  const { _id } = req.params;
  const { reserve } = req.body;
  const { userId } = req;

  try {
    const vehicle = await Vehicle.findOne({ _id }).exec();

    const user = await User.findOne({ _id: userId }).exec();

    if (!vehicle || !user) {
      next(new APIError(`Vehicle id ${_id} doesn't exist`, httpStatus.BAD_REQUEST, true));
      return;
    }

    if (!vehicle.online || !vehicle.locked || vehicle.charging) {
      next(new APIError(`Vehicle id ${_id} can't be reserved`, httpStatus.BAD_REQUEST, true));
      return;
    }

    let success = false;
    const now = new Date();

    if (reserve) {
      // attempt to reserve a vehicle
      if (!vehicle.reserved) {
        // user has to wait for 15 mins before next reserve

        if (user.canReserveVehicleAfter && now < user.canReserveVehicleAfter) {
          next(
            new APIError(
              `You need wait for ${moment
                .duration((user.canReserveVehicleAfter - now) / 1000, 'seconds')
                .humanize()} to reserve again`,
              httpStatus.BAD_REQUEST,
              true
            )
          );
          return;
        }

        vehicle.reserved = true;
        vehicle.reservedBy = userId;
        const reservedUntil = new Date(
          now.getTime() + parseInt(process.env.APP_VEHICLE_RESERVE_MAX_DURATION, 10) * 1000
        );
        vehicle.reservedUntil = reservedUntil;

        // cancel previously scheduled job
        if (vehicle.reserveTimeoutKey) {
          clearTimer(vehicle.reserveTimeoutKey);
        }

        // schedule a delayed job to reset reserve state
        const timer = setTimeout(() => {
          vehicle.reserved = false;
          vehicle.reservedBy = undefined;
          vehicle.reserveTimeoutKey = undefined;
          vehicle.reservedUntil = undefined;
          vehicle.save();
        }, process.env.APP_VEHICLE_RESERVE_MAX_DURATION * 1000);

        vehicle.reserveTimeoutKey = addTimer(timer);

        success = true;
      } else {
        next(new APIError('Sorry, this scooter has been reserved', httpStatus.OK, true));
        return;
      }
    } else if (vehicle.reserved && vehicle.reservedBy.equals(userId)) {
      // cancel previously scheduled job
      if (vehicle.reserveTimeoutKey) {
        clearTimer(vehicle.reserveTimeoutKey);
      }

      // un-reserve a vehicle
      vehicle.reserved = false;
      vehicle.reservedBy = undefined;
      vehicle.reserveTimeoutKey = undefined;
      vehicle.reservedUntil = undefined;

      success = true;
    } else {
      next(new APIError('This scooter is not reserved', httpStatus.BAD_REQUEST, true));
      return;
    }

    // record user vehicle reserve history
    if (success) {
      user.canReserveVehicleAfter = new Date(
        now.getTime() + parseInt(process.env.APP_VEHICLE_RESERVE_WAITING_PERIOD, 10) * 1000
      );
      await user.save();
    }

    await vehicle.save();

    res.json(normalizeVehicleResult(vehicle, user));
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
