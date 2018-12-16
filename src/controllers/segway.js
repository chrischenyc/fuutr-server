const httpStatus = require('http-status');
const axios = require('axios');
const querystring = require('querystring');

const Vehicle = require('../models/vehicle');

const APIError = require('../helpers/api-error');
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
    logger.error(error.message);
  }
};

exports.requestAccessToken = requestAccessToken;

const scheduleAccessTokenRefresh = (after) => {
  setTimeout(() => {
    requestAccessToken();
  }, after * 1000);
};

// https://api.segway.pt/doc/index.html#api-Query-VehicleQuery
const queryVehicle = async (iotCode, vehicleCode) => {
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
const lockVehicle = async (iotCode, vehicleCode) => {
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

// api.segway.pt/doc/index.html#api-VehicleIoT-VehicleIoTBinding
exports.bindVehicle = async (iotCode, vehicleCode) => {
  try {
    const data = {
      iotCode,
      vehicleCode,
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
