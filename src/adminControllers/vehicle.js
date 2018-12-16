const httpStatus = require('http-status');
const _ = require('lodash');
const QRCode = require('qrcode');
const fs = require('fs');

const Vehicle = require('../models/vehicle');

const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');
const { adminTablePaginationLimit } = require('../helpers/constants');
const S3Upload = require('../helpers/s3-upload');

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
      .select({
        unlockCode: 1,
        iotCode: 1,
        vehicleCode: 1,
        online: 1,
        locked: 1,
        charging: 1,
        powerPercent: 1,
        remainderRange: 1,
      })
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
    const vehicle = await Vehicle.findOne({ _id })
      .select({
        unlockCode: 1,
        iotCode: 1,
        vehicleCode: 1,
        online: 1,
        locked: 1,
        charging: 1,
        powerPercent: 1,
        remainderRange: 1,
      })
      .exec();

    res.json(vehicle);
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

const generateNewUnlockCode = async () => {
  let isUnique = false;
  let unlockCode = null;

  const vehicles = await Vehicle.find({ unlockCode: { $exists: 1 } }).select({
    unlockCode: 1,
  });

  const existingUnlockCodes = vehicles.map(vehicle => vehicle.unlockCode);

  while (!isUnique) {
    unlockCode = Number(Math.floor(100000 + Math.random() * 900000)).toString();
    isUnique = !existingUnlockCodes.includes(unlockCode);
  }

  return unlockCode;
};

exports.generateNewUnlockCode = generateNewUnlockCode;

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

exports.generateUnlockCodeQRImage = generateUnlockCodeQRImage;

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

    // TODO: validate vehicle code and iot code on Segway API

    const unlockCode = await generateNewUnlockCode();
    const unlockQRImage = await generateUnlockCodeQRImage(vehicleCode, iotCode, unlockCode);
    const vehicle = new Vehicle({
      vehicleCode,
      iotCode,
      unlockCode,
      unlockQRImage,
    });

    await vehicle.save();

    res.json(vehicle);
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
