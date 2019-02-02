const httpStatus = require('http-status');
const _ = require('lodash');
const QRCode = require('qrcode');
const fs = require('fs');

const Vehicle = require('../models/vehicle');

const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');
const { adminTablePaginationLimit } = require('../helpers/constants');
const S3Upload = require('../helpers/s3-upload');

const {
  bindVehicle, queryVehicle, lockVehicle, unlockVehicle,
} = require('../controllers/segway');

exports.getVehicles = async (req, res, next) => {
  const { user, page, search } = req.query;

  try {
    let selector = {};

    if (!_.isEmpty(user)) {
      selector = { ...selector, user };
    }

    if (!_.isEmpty(search)) {
      selector = {
        ...selector,
        $or: [
          { unlockCode: { $regex: search, $options: 'i' } },
          { vehicleCode: { $regex: search, $options: 'i' } },
          { iotCode: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const vehicles = await Vehicle.find(selector)
      .limit(adminTablePaginationLimit)
      .skip(page * adminTablePaginationLimit)
      .sort({ createdAt: -1 });

    const total = await Vehicle.countDocuments(selector);

    res.json({ vehicles, pages: Math.ceil(total / adminTablePaginationLimit) });
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.getVehicle = async (req, res, next) => {
  const { _id } = req.params;

  try {
    const vehicle = await Vehicle.findOne({ _id }).exec();

    res.json(vehicle);
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

const generateNewUnlockCode = async () => {
  let isUnique = false;
  let unlockCode = null;

  const vehicles = await Vehicle.find({ unlockCode: { $exists: 1 } });

  const existingUnlockCodes = vehicles.map(vehicle => vehicle.unlockCode);

  while (!isUnique) {
    unlockCode = Number(Math.floor(100000 + Math.random() * 900000)).toString();
    isUnique = !existingUnlockCodes.includes(unlockCode);
  }

  return unlockCode;
};

const generateUnlockCodeQRImage = async (vehicleCode, iotCode, unlockCode) => {
  // generate unlock QR code image in local temp folder
  const uploadFolder = './upload';
  if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder);
  }
  const imageFilePath = `${uploadFolder}/${vehicleCode}_${iotCode}.png`;
  await QRCode.toFile(imageFilePath, unlockCode, { width: 640 });

  // upload to S3
  const imageUrl = await S3Upload(imageFilePath);

  // remove tmp image file
  fs.unlinkSync(imageFilePath);

  return imageUrl;
};

exports.addVehicle = async (req, res, next) => {
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
      remainingRange,
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
      remainingRange: remainingRange * 10,
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

exports.editVehicle = async (req, res, next) => {
  const { _id } = req.params;
  const { vehicleCode, iotCode } = req.body;

  try {
    const existingVehicle = await Vehicle.findOne({ _id }).exec();

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

exports.lockVehicle = async (req, res, next) => {
  const { _id } = req.params;
  const { lock } = req.body;

  try {
    const vehicle = await Vehicle.findOne({ _id }).exec();

    if (!vehicle) {
      next(new APIError(`Vehicle id ${_id} doesn't exist`, httpStatus.INTERNAL_SERVER_ERROR, true));
    }

    if (lock) {
      await lockVehicle(vehicle.iotCode, vehicle.vehicleCode);
    } else {
      await unlockVehicle(vehicle.iotCode, vehicle.vehicleCode);
    }

    await Vehicle.update(
      { _id },
      {
        $set: {
          locked: lock,
        },
      }
    );

    res.status(httpStatus.OK).send();
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
