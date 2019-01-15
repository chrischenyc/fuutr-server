const httpStatus = require('http-status');
const _ = require('lodash');
const md5 = require('md5');

const Vehicle = require('../models/vehicle');

const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');

const updateVehicleStatus = require('../helpers/update-vehicle-status');

// TODO: replace with mongodb $near query: https://docs.mongodb.com/manual/reference/operator/query/near/
exports.searchVehicles = async (req, res, next) => {
  const {
    minLatitude, minLongitude, maxLatitude, maxLongitude,
  } = req.query;

  try {
    let vehicles = await Vehicle.find({
      online: true,
      locked: true,
      charging: false,
      powerPercent: { $gt: 0 },
      reserved: false,
    }).select({
      vehicleCode: 1,
      powerPercent: 1,
      location: 1,
      remainderRange: 1,
    });

    vehicles = vehicles.map(vehicle => _.omit(
      {
        ...vehicle,
        vehicleCode: `xxxx-${vehicle.vehicleCode.slice(-4)}`,
        longitude: vehicle.location.coordinates[0],
        latitude: vehicle.location.coordinates[1],
      },
      ['location']
    ));

    res.json(vehicles);
  } catch (error) {
    logger.error(error.message);
    next(new APIError("couldn't find scooters", httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

const validateSegwayPushBody = (body) => {
  const { signature } = body;

  const sortedKeys = Object.keys(_.omit(body, 'signature')).sort();
  const keyValues = sortedKeys.map(key => `${key}=${body[key]}`);
  keyValues.push(`client_secret=${process.env.SEGWAY_CLIENT_SECRET}`);

  const rawString = keyValues.join('&');

  const encryptedString = md5(rawString);

  return signature === encryptedString;
};

exports.updateVehicleStatus = async (req, res, next) => {
  try {
    // validate signature
    if (!validateSegwayPushBody(req.body)) {
      res.status(httpStatus.BAD_REQUEST).send();
      return;
    }

    const { vehicleCode, iotCode } = req.body;

    const vehicle = await Vehicle.findOne({
      vehicleCode,
      iotCode,
    }).exec();

    if (!vehicle) {
      res.status(httpStatus.INTERNAL_SERVER_ERROR).send();
      return;
    }

    await updateVehicleStatus(vehicleCode, iotCode, req.body);

    logger.info(`Segway push: status updated iotCode ${iotCode} vehicleCode ${vehicleCode}`);

    res.status(httpStatus.OK).send();
  } catch (error) {
    logger.error(`Segway push error: ${error.message}`);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send();
  }
};
