const httpStatus = require('http-status');

const Scooter = require('../models/scooter');
const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');

exports.searchScooters = async (req, res, next) => {
  const { lat, lon, radius } = req.query;

  try {
    const scooters = await Scooter.find({}).select({});

    res.json(scooters);
  } catch (error) {
    logger.error(error);
    next(new APIError("couldn't find scooters", httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
