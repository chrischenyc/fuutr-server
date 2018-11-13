const httpStatus = require('http-status');

const Scooter = require('../models/scooter');
const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');

const { mockScooters, mockScooters2 } = require('../helpers/mock-data');

/**
 * search scooters within x radius of lat/lon, which are suitable for riding
 */
exports.searchScootersInRadius = async (req, res, next) => {
  const { latitude, longitude, radius } = req.query;

  try {
    const scooters = await Scooter.find({
      online: true,
      locked: true,
      charging: false,
      powerPercent: { $gt: 0 },
      latitude: { $gt: latitude - radius / 110.574, $lt: latitude + radius / 110.574 },
    }).select({
      iotCode: 1,
      vehicleCode: 1,
      powerPercent: 1,
      latitude: 1,
      longitude: 1,
    });

    // FIXME: mock data!!!
    // res.json(scooters);
    res.json(mockScooters(latitude, longitude, radius));
  } catch (error) {
    logger.error(error.message);
    next(new APIError("couldn't find scooters", httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.searchScootersInBound = async (req, res, next) => {
  const {
    minLatitude, minLongitude, maxLatitude, maxLongitude,
  } = req.query;

  try {
    const scooters = await Scooter.find({
      online: true,
      locked: true,
      charging: false,
      powerPercent: { $gt: 0 },
      latitude: { $gt: minLatitude, $lt: maxLatitude },
      longitude: { $gt: minLongitude, $lt: maxLongitude },
    }).select({
      iotCode: 1,
      vehicleCode: 1,
      powerPercent: 1,
      latitude: 1,
      longitude: 1,
    });

    // FIXME: mock data!!!
    // res.json(scooters);
    res.json(mockScooters2(minLatitude, minLongitude, maxLatitude, maxLongitude));
  } catch (error) {
    logger.error(error.message);
    next(new APIError("couldn't find scooters", httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
