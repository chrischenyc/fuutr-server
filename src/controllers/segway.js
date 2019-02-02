const axios = require('axios');
const querystring = require('querystring');
const _ = require('lodash');
const md5 = require('md5');
const httpStatus = require('http-status');

const Vehicle = require('../models/vehicle');
const Zone = require('../models/zone');

const logger = require('../helpers/logger');

const segwayClient = axios.create({
  baseURL: 'https://api.segway.pt',
});

exports.segwayClient = segwayClient;

// https://api.segway.pt/doc/index.html#api-Auth-Authorization
const requestAccessToken = async () => {
  try {
    const params = {
      client_id: process.env.SEGWAY_CLIENT_ID,
      client_secret: process.env.SEGWAY_CLIENT_SECRET,
      grant_type: 'client_credentials',
    };

    const query = querystring.stringify(params);

    const response = await segwayClient({
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      method: 'post',
      url: `/oauth/token?${query}`,
    });

    if (!response || !response.data || !response.data.access_token || !response.data.expires_in) {
      throw Error("couldn't get segway access token");
    }

    const { access_token, expires_in } = response.data;
    segwayClient.defaults.headers.common.Authorization = `bearer ${access_token}`;
    logger.info(`Segway access token acquired, expires in ${expires_in}`);

    scheduleAccessTokenRefresh(expires_in);
  } catch (error) {
    logger.error(`Segway access token error: ${error.message}`);
  }
};

exports.requestAccessToken = requestAccessToken;

const scheduleAccessTokenRefresh = (after) => {
  setTimeout(() => {
    requestAccessToken();
  }, after * 1000);
};

// https://apac-api.segway.pt/doc/index.html#api-Push-PushVehicleStatus
const validateSegwayPushBody = (body) => {
  const { signature } = body;

  const sortedKeys = Object.keys(_.omit(body, 'signature')).sort();
  const keyValues = sortedKeys.map(key => `${key}=${body[key]}`);
  keyValues.push(`client_secret=${process.env.SEGWAY_CLIENT_SECRET}`);

  const rawString = keyValues.join('&');

  const encryptedString = md5(rawString);

  return signature === encryptedString;
};

exports.receiveVehicleStatusPush = async (req, res) => {
  try {
    // validate signature
    if (!validateSegwayPushBody(req.body)) {
      res.status(httpStatus.BAD_REQUEST).send();
      return;
    }

    logger.info(JSON.stringify(req.body));

    const {
      iotCode,
      vehicleCode,
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
      latitude,
      longitude,
      altitude,
      statusUtcTime,
      gpsUtcTime,
    } = req.body;

    // match with an existing vehicle
    const vehicle = await Vehicle.findOne({
      vehicleCode,
      iotCode,
    }).exec();

    if (!vehicle) {
      res.status(httpStatus.INTERNAL_SERVER_ERROR).send();
      return;
    }

    const { location: previousLocation, address: previousAddress, inRide } = vehicle;

    // the values that will eventually be $set to the Vehicle document
    logger.info(`status update reminderRange: ${remainderRange}`);

    let valuesToUpdate = {
      online,
      locked,
      networkSignal,
      charging,
      powerPercent,
      speedMode,
      speed,
      odometer: odometer * 10,
      remainderRange: parseFloat(remainderRange) * 10,
      totalRidingSecs,
      altitude,
      statusUtcTime,
      gpsUtcTime,
    };

    // convert new lat/lng to GeoJSON format
    // sometime Segway pushes 0.0/0.0, we need to filter invalid lat/lng
    if (longitude && latitude && !(parseFloat(latitude) === 0 && parseFloat(longitude) === 0)) {
      valuesToUpdate = {
        ...valuesToUpdate,
        location: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
      };
    }

    const { location } = valuesToUpdate;

    // geo-fenced speed limit: update vehicle's speed mode during a ride
    if (location && inRide && !locked) {
      const insideSpeedZones = await Zone.find({
        active: true,
        speedMode: { $in: [1, 2] }, // 1 and 2 are low and middle speed mode
        polygon: {
          $geoIntersects: { $geometry: location },
        },
      }).sort({ speedMode: 1 });

      let newSpeedMode = speedMode;

      if (insideSpeedZones.length > 0) {
        newSpeedMode = insideSpeedZones[0].speedMode;
      } else {
        // use 3 the fastest speed mode if vehicle is outside any speed zone
        newSpeedMode = 3;
      }

      if (speedMode !== newSpeedMode) {
        const segwayResult = await updateVehicleSpeedMode(iotCode, vehicleCode, newSpeedMode);
        if (!segwayResult.success) {
          logger.error(`Segway API error, can't update speed mode: ${segwayResult}`);
        } else {
          logger.info(
            `Segway speed mode: update vehicle ${vehicle._id} speed mode to ${newSpeedMode}`
          );
        }
      }
    }

    // reverse-geo query vehicle's new address when it's not in use
    // if location is new or vehicle doesn't have an address
    // this info is mainly used in search view
    if (
      !inRide
      && location
      && (!_.isEqual(previousLocation, location) || _.isNil(previousAddress))
    ) {
      // https://developers.google.com/maps/documentation/geocoding/intro
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.coordinates[1]},${
          location.coordinates[0]
        }&key=${process.env.GOOGLE_MAPS_API_KEY}&language=en-Au`
      );

      if (response && response.data && response.data.results && response.data.results.length > 0) {
        const { formatted_address: address } = response.data.results[0];

        valuesToUpdate.address = address;

        logger.info(`Update vehicle ${vehicle._id} address to${address}`);
      }
    }

    await Vehicle.update(
      { vehicleCode, iotCode },
      {
        $set: valuesToUpdate,
      }
    );

    logger.info(
      `Segway push: status updated vehicle ${
        vehicle._id
      } iotCode ${iotCode} vehicleCode ${vehicleCode}`
    );

    res.status(httpStatus.OK).send();
  } catch (error) {
    logger.error(`Segway push error: ${error.message}`);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send();
  }
};

// https://api.segway.pt/doc/index.html#api-Query-VehicleQuery
exports.queryVehicle = async (iotCode, vehicleCode) => {
  try {
    const params = {
      iotCode,
      vehicleCode,
    };

    const query = querystring.stringify(params);

    const response = await segwayClient({
      method: 'get',
      url: `/api/vehicle/query/get?${query}`,
    });

    return response.data;
  } catch (error) {
    logger.error(error.response.data.message);

    return null;
  }
};

// https://api.segway.pt/doc/index.html#api-Control-VehicleUnlock
exports.unlockVehicle = async (iotCode, vehicleCode) => {
  try {
    const data = {
      iotCode,
      vehicleCode,
    };

    const response = await segwayClient({
      method: 'post',
      data,
      url: '/api/vehicle/control/unlock',
    });

    return response.data;
  } catch (error) {
    return { success: false, message: error.response.data.message };
  }
};

// https://api.segway.pt/doc/index.html#api-Control-VehicleLock
exports.lockVehicle = async (iotCode, vehicleCode) => {
  try {
    const data = {
      iotCode,
      vehicleCode,
    };

    const response = await segwayClient({
      method: 'post',
      data,
      url: '/api/vehicle/control/lock',
    });

    return response.data;
  } catch (error) {
    logger.error(error.response.data.message);

    return null;
  }
};

// https://api.segway.pt/doc/index.html#api-Control-VehicleSpeedMode
const updateVehicleSpeedMode = async (iotCode, vehicleCode, speedMode) => {
  try {
    const data = {
      iotCode,
      vehicleCode,
      speedMode,
    };

    const response = await segwayClient({
      method: 'post',
      data,
      url: '/api/vehicle/control/speed-mode',
    });

    return response.data;
  } catch (error) {
    logger.error(error.response.data.message);

    return null;
  }
};

exports.updateVehicleSpeedMode = updateVehicleSpeedMode;

// api.segway.pt/doc/index.html#api-VehicleIoT-VehicleIoTBinding
exports.bindVehicle = async (iotCode, vehicleCode, qrCode) => {
  try {
    const data = {
      iotCode,
      vehicleCode,
      qrCode,
    };

    const response = await segwayClient({
      method: 'post',
      data,
      url: '/api/vehicle/iot/bind',
    });

    return response.data;
  } catch (error) {
    logger.error(error.response.data.message);

    return null;
  }
};
