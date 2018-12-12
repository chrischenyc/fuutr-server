const httpStatus = require('http-status');

const Vehicle = require('../models/vehicle');

const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');

const { mockVehiclesInBound } = require('../helpers/mock-data');

// TODO: replace with mongodb $near query: https://docs.mongodb.com/manual/reference/operator/query/near/
exports.searchVehicles = async (req, res, next) => {
  const {
    minLatitude, minLongitude, maxLatitude, maxLongitude,
  } = req.query;

  try {
    const vehicles = await Vehicle.find({
      online: true,
      locked: true,
      charging: false,
      powerPercent: { $gt: 0 },
    }).select({
      iotCode: 1,
      powerPercent: 1,
      latitude: 1,
      longitude: 1,
      remainderRange: 1,
    });

    // FIXME: mock data!!!
    // res.json(vehicles);
    res.json(mockVehiclesInBound(minLatitude, minLongitude, maxLatitude, maxLongitude));
  } catch (error) {
    logger.error(error.message);
    next(new APIError("couldn't find scooters", httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
