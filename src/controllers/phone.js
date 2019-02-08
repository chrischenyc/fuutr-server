const httpStatus = require('http-status');
const axios = require('axios');

const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');

// twilio doc: https://www.twilio.com/docs/verify/api/verification
exports.startPhoneVerification = async (req, res, next) => {
  const { phoneNumber, countryCode } = req.body;

  try {
    const response = await axios({
      method: 'post',
      url: 'https://api.authy.com/protected/json/phones/verification/start',
      headers: { 'X-Authy-API-Key': process.env.TWILIO_API_KEY },
      data: {
        via: 'sms',
        phone_number: phoneNumber,
        country_code: countryCode,
        code_length: 6,
      },
    });

    if (response.data.success) {
      res.sendStatus(httpStatus.OK);
    } else {
      throw Error('twilio response is not successful');
    }
  } catch (error) {
    logger.error(error.message);

    next(
      new APIError(
        `Couldn't send SMS message to ${phoneNumber}. Please try again.`,
        httpStatus.INTERNAL_SERVER_ERROR,
        true
      )
    );
  }
};

// twilio doc: https://www.twilio.com/docs/verify/api/verification
exports.checkVerificationCode = async (req, res, next) => {
  const { phoneNumber, countryCode, verificationCode } = req.body;

  try {
    const response = await axios({
      method: 'get',
      url: 'https://api.authy.com/protected/json/phones/verification/check',
      headers: { 'X-Authy-API-Key': process.env.TWILIO_API_KEY },
      data: {
        country_code: countryCode,
        phone_number: phoneNumber,
        verification_code: verificationCode,
      },
    });

    if (response.data.success) {
      next();
    } else {
      throw Error('twilio response is not successful');
    }
  } catch (error) {
    logger.error(error.message);

    next(
      new APIError("Couldn't verify your code, please try again.", httpStatus.UNAUTHORIZED, true)
    );
  }
};
