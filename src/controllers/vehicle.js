const httpStatus = require('http-status');
const _ = require('lodash');
const md5 = require('md5');
const moment = require('moment');
const axios = require('axios');

const Vehicle = require('../models/vehicle');
const User = require('../models/user');
const Zone = require('../models/zone');

const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');

const { addTimer, clearTimer } = require('../helpers/timer-manager');
const { updateVehicleSpeedMode } = require('./segway');

const normalizeVehicle = require('../helpers/normalize-vehicle');

// https://apac-api.segway.pt/doc/index.html#api-Push-PushVehicleStatus
const validateSegwayPushBody = (body) => {
  const { signature } = body;

  const sortedKeys = Object.keys(_.omit(body, 'signature')).sort();
  const keyValues = sortedKeys.map(key => `${key}=${body[key]}`);
  keyValues.push(`client_secret=${process.env.SEGWAY_CLIENT_SECRET}`);

  const rawString = keyValues.join('&');

  const encryptedString = md5(rawString);

  return signature === encryptedString;
};

exports.receiveVehicleStatusPush = async (req, res) => {
  try {
    // validate signature
    if (!validateSegwayPushBody(req.body)) {
      res.status(httpStatus.BAD_REQUEST).send();
      return;
    }

    const {
      iotCode,
      vehicleCode,
      online,
      locked,
      networkSignal,
      charging,
      powerPercent,
      speedMode,
      speed,
      odometer,
      remainderRange,
      totalRidingSecs,
      latitude,
      longitude,
      altitude,
      statusUtcTime,
      gpsUtcTime,
    } = req.body;

    // match with an existing vehicle
    const vehicle = await Vehicle.findOne({
      vehicleCode,
      iotCode,
    }).exec();

    if (!vehicle) {
      res.status(httpStatus.INTERNAL_SERVER_ERROR).send();
      return;
    }

    const { location: previousLocation, address: previousAddress, inRide } = vehicle;

    // the values that will eventually be $set to the Vehicle document
    let valuesToUpdate = {
      online,
      locked,
      networkSignal,
      charging,
      powerPercent,
      speedMode,
      speed,
      odometer,
      remainderRange,
      totalRidingSecs,
      altitude,
      statusUtcTime,
      gpsUtcTime,
    };

    // convert new lat/lng to GeoJSON format
    // sometime Segway pushes 0.0/0.0, we need to filter invalid lat/lng
    if (longitude && latitude && !(parseFloat(latitude) === 0 && parseFloat(longitude) === 0)) {
      valuesToUpdate = {
        ...valuesToUpdate,
        location: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
      };
    }

    const { location } = valuesToUpdate;

    // geo-fenced speed limit: update vehicle's speed mode during a ride
    if (location && inRide && !locked) {
      const insideSpeedZones = await Zone.find({
        active: true,
        speedMode: { $in: [1, 2] }, // 1 and 2 are low and middle speed mode
        polygon: {
          $geoIntersects: { $geometry: location },
        },
      }).sort({ speedMode: 1 });

      let newSpeedMode = speedMode;

      if (insideSpeedZones.length > 0) {
        newSpeedMode = insideSpeedZones[0].speedMode;
      } else {
        // use 3 the fastest speed mode if vehicle is outside any speed zone
        newSpeedMode = 3;
      }

      if (speedMode !== newSpeedMode) {
        const segwayResult = await updateVehicleSpeedMode(iotCode, vehicleCode, newSpeedMode);
        if (!segwayResult.success) {
          logger.error(`Segway API error, can't update speed mode: ${segwayResult}`);
        } else {
          logger.info(
            `Segway speed mode: update vehicle ${vehicle._id} speed mode to ${newSpeedMode}`
          );
        }
      }
    }

    // reverse-geo query vehicle's new address when it's not in use
    // if location is new or vehicle doesn't have an address
    // this info is mainly used in search view
    if (
      !inRide
      && location
      && (!_.isEqual(previousLocation, location) || _.isNil(previousAddress))
    ) {
      // https://developers.google.com/maps/documentation/geocoding/intro
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.coordinates[1]},${
          location.coordinates[0]
        }&key=${process.env.GOOGLE_MAPS_API_KEY}&language=en-Au`
      );

      if (response && response.data && response.data.results && response.data.results.length > 0) {
        const { formatted_address: address } = response.data.results[0];

        valuesToUpdate.address = address;

        logger.info(`Update vehicle ${vehicle._id} address to${address}`);
      }
    }

    await Vehicle.update(
      { vehicleCode, iotCode },
      {
        $set: valuesToUpdate,
      }
    );

    logger.info(
      `Segway push: status updated vehicle ${
        vehicle._id
      } iotCode ${iotCode} vehicleCode ${vehicleCode}`
    );

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

    res.json(normalizeVehicle(vehicle, user));
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
