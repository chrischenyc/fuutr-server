const httpStatus = require('http-status');
const _ = require('lodash');

const Zones = require('../models/zone');

const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');
const { adminTablePaginationLimit } = require('../helpers/constants');

exports.getZones = async (req, res, next) => {
  const { page, search } = req.query;

  try {
    let selector = {};

    if (!_.isEmpty(search)) {
      selector = {
        ...selector,
        $or: [{ note: { $regex: search, $options: 'i' } }],
      };
    }

    const zones = await Zones.find(selector)
      .limit(adminTablePaginationLimit)
      .skip(page * adminTablePaginationLimit)
      .sort({ createdAt: -1 });

    const total = await Zones.countDocuments(selector);

    res.json({ zones, pages: Math.ceil(total / adminTablePaginationLimit) });
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

/*
exports.addZone = async (req, res, next) => {
  const { vehicleCode, iotCode } = req.body;

  try {
    let existingVehicle = await Vehicle.findOne({ vehicleCode }).exec();

    if (existingVehicle) {
      next(
        new APIError(`Vehicle Code ${vehicleCode} exists`, httpStatus.INTERNAL_SERVER_ERROR, true)
      );
    }

    existingVehicle = await Vehicle.findOne({ iotCode }).exec();

    if (existingVehicle) {
      next(new APIError(`IoT Code ${iotCode} exists`, httpStatus.INTERNAL_SERVER_ERROR, true));
    }

    const unlockCode = await generateNewUnlockCode();
    const unlockQRImage = await generateUnlockCodeQRImage(vehicleCode, iotCode, unlockCode);

    // bind IoT code, vehicle code, and QR code on Segway
    await bindVehicle(iotCode, vehicleCode, unlockCode);

    const vehicleStatus = await queryVehicle(iotCode, vehicleCode);

    const {
      online,
      locked,
      networkSignal,
      charging,
      powerPercent,
      speedMode,
      speed,
      odometer,
      remainderRange,
      latitude,
      longitude,
      altitude,
      statusUtcTime,
      gpsUtcTime,
    } = vehicleStatus;

    const vehicle = new Vehicle({
      vehicleCode,
      iotCode,
      unlockCode,
      unlockQRImage,
      online,
      locked,
      networkSignal,
      charging,
      powerPercent,
      speedMode,
      speed,
      odometer,
      remainderRange,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      altitude,
      statusUtcTime,
      gpsUtcTime,
    });

    await vehicle.save();

    res.json(vehicle);
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
*/

/*
exports.editVehicle = async (req, res, next) => {
  const { _id } = req.params;
  const { vehicleCode, iotCode } = req.body;

  try {
    const existingVehicle = await Vehicle.findOne({ _id })
      .select({
        unlockCode: 1,
      })
      .exec();

    if (!existingVehicle) {
      next(new APIError(`Vehicle id ${_id} doesn't exist`, httpStatus.INTERNAL_SERVER_ERROR, true));
    }

    // re-bind IoT code, vehicle code, and existing QR code on Segway
    await bindVehicle(iotCode, vehicleCode, existingVehicle.unlockCode);

    const vehicleStatus = await queryVehicle(iotCode, vehicleCode);

    await Vehicle.update(
      { _id },
      {
        $set: {
          iotCode,
          vehicleCode,
          ...vehicleStatus,
        },
      }
    );

    res.status(httpStatus.OK).send();
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
*/
