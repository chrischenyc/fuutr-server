const httpStatus = require('http-status');
const moment = require('moment');

const Vehicle = require('../models/vehicle');
const User = require('../models/user');

const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');
const { addTimer, clearTimer } = require('../helpers/timer-manager');
const normalizeVehicle = require('../helpers/normalize-vehicle');
const { toot } = require('./segway');

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
    logger.error(JSON.stringify(error));
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.tootVehicle = async (req, res, next) => {
  const { _id } = req.params;
  const { latitude, longitude } = req.body;

  try {
    const vehicle = await Vehicle.findOne({
      _id,
      location: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: process.env.APP_VEHICLE_ENABLE_TOOT_RADIUS,
        },
      },
    }).exec();

    if (!vehicle) {
      next(
        new APIError(
          'To use ring function, you need to be close enough to the scooter.',
          httpStatus.BAD_REQUEST,
          true
        )
      );
      return;
    }

    // a flag to bypass actual IoT unlock/lock
    if (process.env.APP_VIRTUAL_VEHICLE_LOCK_UNLOCK !== 'true') {
      const segwayResult = await toot(vehicle.iotCode, vehicle.vehicleCode);

      if (!segwayResult.success) {
        logger.error(`Segway API error: ${JSON.stringify(segwayResult)}`);

        next(new APIError("couldn't toot scooter", httpStatus.INTERNAL_SERVER_ERROR, true));
        return;
      }
    }

    res.status(httpStatus.OK).send();
  } catch (error) {
    logger.error(JSON.stringify(error));
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
