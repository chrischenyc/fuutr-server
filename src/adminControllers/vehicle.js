const httpStatus = require('http-status');
const _ = require('lodash');

const Vehicle = require('../models/vehicle');

const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');
const { adminTablePaginationLimit } = require('../helpers/constants');

exports.getVehicles = async (req, res, next) => {
  const { user, page } = req.query;

  try {
    let selector = {};

    if (!_.isEmpty(user)) {
      selector = { ...selector, user };
    }

    const vehicles = await Vehicle.find(selector)
      .select({
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
        user: 1,
        vehicle: 1,
        unlockTime: 1,
        lockTime: 1,
        unlockLocation: 1,
        lockLocation: 1,
        route: 1,
        encodedPath: 1,
        duration: 1,
        distance: 1,
        completed: 1,
        unlockCost: 1,
        minuteCost: 1,
        totalCost: 1,
      })
      .exec();

    res.json(vehicle);
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.generateNewUnlockCode = async () => {
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
