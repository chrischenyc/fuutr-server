const httpStatus = require('http-status');

const Zones = require('../models/zone');

const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');

exports.getZones = async (req, res, next) => {
  try {
    const selector = { active: true };

    let zones = await Zones.find(selector);
    zones = zones.map((zone) => {
      const polygon = zone.polygon.coordinates[0];
      polygon.pop();

      return {
        active: zone.active,
        parking: zone.parking,
        speedMode: zone.speedMode,
        note: zone.note,
        polygon,
      };
    });

    res.json(zones);
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
