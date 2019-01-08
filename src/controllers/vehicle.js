const httpStatus = require('http-status');
const _ = require('lodash');
const md5 = require('md5');

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
      location: 1,
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

const validateSegwayPushBody = (body) => {
  const { signature } = body;

  const sortedKeys = Object.keys(_.omit(body, 'signature')).sort();
  const keyValues = sortedKeys.map(key => `${key}=${body[key]}`);
  keyValues.push(`client_secret=${process.env.SEGWAY_CLIENT_SECRET}`);

  const rawString = keyValues.join('&');

  const encryptedString = md5(rawString);

  logger.info(`Segway push signature: ${signature}`);
  logger.info(`Segway push md5: ${encryptedString}`);

  return signature === encryptedString;
};

exports.updateVehicleStatus = async (req, res, next) => {
  logger.info(`Segway push request: ${JSON.stringify(req.body)}`);

  const {
    vehicleCode,
    iotCode,
    signature,
    online,
    locked,
    networkSignal,
    charging,
    powerPercent,
    speedMode,
    speed,
    odometer,
    remainderRange,
    totalRidingSecs,
    statusUtcTime,
    latitude,
    longitude,
    altitude,
    gpsUtcTime,
  } = req.body;

  try {
    // validate signature
    if (!validateSegwayPushBody(req.body)) {
      res.status(httpStatus.BAD_REQUEST).send();
      return;
    }

    const vehicle = await Vehicle.findOne({
      vehicleCode,
      iotCode,
    }).exec();

    if (!vehicle) {
      res.status(httpStatus.INTERNAL_SERVER_ERROR).send();
      return;
    }

    logger.info('Segway push: start updating vehicle status');

    Vehicle.update(
      { vehicleCode, iotCode },
      {
        $set: {
          signature,
          online,
          locked,
          networkSignal,
          charging,
          powerPercent,
          speedMode,
          speed,
          odometer,
          remainderRange,
          totalRidingSecs,
          statusUtcTime,
          latitude,
          longitude,
          altitude,
          gpsUtcTime,
        },
      }
    );

    res.status(httpStatus.OK).send();
  } catch (error) {
    logger.error(`Segway push error: ${error.message}`);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send();
  }
};
