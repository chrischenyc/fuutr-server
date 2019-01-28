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

      let result = {
        active: zone.active,
        parking: zone.parking,
        speedMode: zone.speedMode,
        polygon,
      };

      if (!zone.parking) {
        result = {
          ...result,
          title: 'No-Parking Zone',
          message: 'You cannot end a ride in this area, please park in an accepted zone.',
        };
      } else if (zone.speedMode === 1) {
        result = {
          ...result,
          title: 'Geo-Fenced Speed Zone',
          message:
            'In high traffic locations like this one, Scooter top speed will be capped via our system. Please prepare to slow down in these areas.',
        };
      } else if (zone.speedMode === 2) {
        result = {
          ...result,
          title: 'Geo-Fenced Speed Zone',
          message:
            'In high traffic locations like this one, Scooter top speed will be capped via our system. Please prepare to slow down in these areas.',
        };
      }

      return result;
    });

    res.json(zones);
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
