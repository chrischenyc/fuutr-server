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
    logger.error(JSON.stringify(error));
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.addZone = async (req, res, next) => {
  let {
    polygon, active, parking, speedMode, note, riding,
  } = req.body;

  try {
    // safe guard no-riding zone's parking and speed limit attributes
    if (!riding) {
      speedMode = 1;
      parking = false;
    }

    const zone = new Zones({
      polygon,
      active,
      parking,
      speedMode,
      note,
      riding,
    });

    await zone.save();

    res.json(zone);
  } catch (error) {
    logger.error(JSON.stringify(error));
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.editZone = async (req, res, next) => {
  const { _id } = req.params;
  let {
    active, parking, speedMode, note, riding,
  } = req.body;

  try {
    const existingZone = await Zones.findOne({ _id }).exec();

    if (!existingZone) {
      next(new APIError(`Zone id ${_id} doesn't exist`, httpStatus.INTERNAL_SERVER_ERROR, true));
    }

    // safe guard no-riding zone's parking and speed limit attributes
    if (!riding) {
      speedMode = 1;
      parking = false;
    }

    existingZone.active = active;
    existingZone.parking = parking;
    existingZone.speedMode = speedMode;
    existingZone.note = note || undefined;
    await existingZone.save();

    res.json(existingZone);
  } catch (error) {
    logger.error(JSON.stringify(error));
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.deleteZone = async (req, res, next) => {
  const { _id } = req.params;

  try {
    await Zones.findOneAndRemove({ _id }).exec();

    res.status(httpStatus.OK).send();
  } catch (error) {
    logger.error(JSON.stringify(error));
    next(new APIError(error.message, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
