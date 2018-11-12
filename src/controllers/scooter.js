const httpStatus = require('http-status');

const Scooter = require('../models/scooter');
const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');

const { mockScooters } = require('../helpers/mock-data');

/**
 * search scooters within x radius of lat/lon, which are suitable for riding
 */
exports.searchScooters = async (req, res, next) => {
  const { lat, lon, radius } = req.query;

  try {
    const scooters = await Scooter.find({
      online: true,
      locked: true,
      charging: false,
      powerPercent: { $gt: 0 },
      latitude: { $gt: lat - radius / 110.574, $lt: lat + radius / 110.574 },
    }).select({
      iotCode: 1,
      vehicleCode: 1,
      powerPercent: 1,
      latitude: 1,
      longitude: 1,
    });

    // FIXME: mock data!!!
    // res.json(scooters);
    res.json(mockScooters(lat, lon, radius));
  } catch (error) {
    logger.error(error);
    next(new APIError("couldn't find scooters", httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
