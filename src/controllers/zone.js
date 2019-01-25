const httpStatus = require('http-status');

const Zones = require('../models/zone');

const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');

exports.getZones = async (req, res, next) => {
  try {
    const selector = { active: true };

    const zones = await Zones.find(selector);

    res.json(zones);
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
