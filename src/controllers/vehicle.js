const httpStatus = require('http-status');
const _ = require('lodash');
const md5 = require('md5');

const Vehicle = require('../models/vehicle');
const User = require('../models/user');

const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');

const updateVehicleStatus = require('../helpers/update-vehicle-status');

exports.searchVehicles = async (req, res, next) => {
  const { latitude, longitude, radius } = req.query;
  const { userId } = req;

  try {
    const selector = {
      vehicleCode: 1,
      powerPercent: 1,
      location: 1,
      remainderRange: 1,
      reserved: 1,
      reservedUntil: 1,
      reservedBy: 1,
    };

    // if user has been reserving a vehicle, return just that one
    let vehicles = await Vehicle.find({
      reserved: true,
      reservedBy: userId,
    }).select(selector);

    // otherwise, return all nearby vehicles
    if (vehicles.length === 0) {
      vehicles = await Vehicle.find({
        online: true,
        locked: true,
        charging: false,
        reserved: false,
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [longitude, latitude] },
            $maxDistance: radius,
          },
        },
      }).select(selector);
    }

    vehicles = vehicles.map(vehicle => _.omit(
      {
        _id: vehicle._id,
        powerPercent: vehicle.powerPercent,
        remainderRange: (vehicle.remainderRange * 10.0) / 1000.0,
        vehicleCode: `xxxx-${vehicle.vehicleCode.slice(-4)}`,
        longitude: vehicle.location.coordinates[0],
        latitude: vehicle.location.coordinates[1],
        reserved: vehicle.reserved,
        reservedUntil: vehicle.reservedUntil,
        reservedBy: vehicle.reservedBy,
      },
      ['location']
    ));

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

exports.updateVehicleStatus = async (req, res, next) => {
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

    await updateVehicleStatus(vehicleCode, iotCode, req.body);

    logger.info(`Segway push: status updated iotCode ${iotCode} vehicleCode ${vehicleCode}`);

    res.status(httpStatus.OK).send();
  } catch (error) {
    logger.error(`Segway push error: ${error.message}`);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send();
  }
};

let resetVehicleReserveTimer;

exports.reserveVehicle = async (req, res, next) => {
  const { _id } = req.params;
  const { reserve } = req.body;
  const { userId } = req;

  try {
    const vehicle = await Vehicle.findOne({ _id })
      .select({
        online: 1,
        locked: 1,
        charging: 1,
        reserved: 1,
        reservedBy: 1,
        reservedUntil: 1,
      })
      .exec();

    if (!vehicle) {
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
        const user = await User.findOne({ _id: userId })
          .select({ canReserveVehicleAfter: 1 })
          .exec();

        if (user.canReserveVehicleAfter && now < user.canReserveVehicleAfter) {
          next(
            new APIError(
              `You need wait for ${Math.round(
                (user.canReserveVehicleAfter - now) / 1000
              )} seconds to reserve again`,
              httpStatus.BAD_REQUEST,
              true
            )
          );
          return;
        }

        vehicle.reserved = true;
        vehicle.reservedBy = userId;

        const reservedUntil = new Date(now.getSeconds() + process.env.APP_VEHICLE_RESERVE_DURATION);
        vehicle.reservedUntil = reservedUntil;

        success = true;

        // reset reserve state
        clearTimeout(resetVehicleReserveTimer);

        resetVehicleReserveTimer = setTimeout(() => {
          vehicle.reserved = false;
          vehicle.reservedBy = undefined;
          vehicle.reservedUntil = undefined;
          vehicle.save();
        }, process.env.APP_VEHICLE_RESERVE_DURATION * 1000);
      } else {
        next(new APIError('Sorry, this scooter has been reserved', httpStatus.OK, true));
        return;
      }
    } else if (vehicle.reserved && vehicle.reservedBy.equals(userId)) {
      // attempt to un-reserve a vehicle
      clearTimeout(resetVehicleReserveTimer);

      vehicle.reserved = false;
      vehicle.reservedBy = undefined;
      vehicle.reservedUntil = undefined;

      success = true;
    } else {
      next(new APIError('This scooter is not reserved', httpStatus.BAD_REQUEST, true));
      return;
    }

    // record user vehicle reserve history
    if (success) {
      await User.update(
        { _id: userId },
        {
          $set: {
            canReserveVehicleAfter: new Date(
              now.getTime() + process.env.APP_VEHICLE_RESERVE_WAITING_PERIOD * 1000
            ),
          },
        }
      );
    }

    await vehicle.save();

    res.json(vehicle);
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
