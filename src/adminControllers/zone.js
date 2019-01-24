const httpStatus = require('http-status');
const _ = require('lodash');

const Zones = require('../models/zone');

const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');
const { adminTablePaginationLimit } = require('../helpers/constants');

exports.getZones = async (req, res, next) => {
  const { page, search } = req.query;

  try {
    let selector = {};

    if (!_.isEmpty(search)) {
      selector = {
        ...selector,
        $or: [{ note: { $regex: search, $options: 'i' } }],
      };
    }

    const zones = await Zones.find(selector)
      .limit(adminTablePaginationLimit)
      .skip(page * adminTablePaginationLimit)
      .sort({ createdAt: -1 });

    const total = await Zones.countDocuments(selector);

    res.json({ zones, pages: Math.ceil(total / adminTablePaginationLimit) });
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.addZone = async (req, res, next) => {
  const {
    active, parking, speedMode, note,
  } = req.body;

  try {
    const zone = new Zones({
      active,
      parking,
      speedMode,
      note,
    });

    await zone.save();

    res.json(zone);
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.editZone = async (req, res, next) => {
  const { _id } = req.params;
  const {
    active, parking, speedMode, note,
  } = req.body;

  try {
    const existingZone = await Zones.findOne({ _id }).exec();

    if (!existingZone) {
      next(new APIError(`Zone id ${_id} doesn't exist`, httpStatus.INTERNAL_SERVER_ERROR, true));
    }

    existingZone.active = active;
    existingZone.parking = parking;
    existingZone.speedMode = speedMode;
    existingZone.note = note || undefined;
    await existingZone.save();

    res.json(existingZone);
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.deleteZone = async (req, res, next) => {
  const { _id } = req.params;

  try {
    await Zones.findOneAndRemove({ _id }).exec();

    res.status(httpStatus.OK).send();
  } catch (error) {
    logger.error(error.message);
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
