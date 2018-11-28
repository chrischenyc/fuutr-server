const httpStatus = require('http-status');
const axios = require('axios');
const querystring = require('querystring');

const Scooter = require('../models/scooter');

const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');

const segwayClient = axios.create({
  baseURL: 'https://api.segway.pt',
});

exports.segwayClient = segwayClient;

// https://api.segway.pt/doc/index.html#api-Auth-Authorization
exports.requestAccessToken = async (callback) => {
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

    callback(expires_in);
  } catch (error) {
    logger.error(error.message);
  }
};
