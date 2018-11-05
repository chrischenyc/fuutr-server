const express = require('express');
const httpStatus = require('http-status');
const axios = require('axios');

const { twilioDebug } = require('../helpers/debug-loggers');
const APIError = require('../helpers/api-error');

const router = express.Router();

// request a verification code to be sent to mobile number
// twilio doc: https://www.twilio.com/docs/verify/api/verification
router.get('/phone-verification/start', (req, res, next) => {
  const { phone_number } = req.query;

  twilioDebug('calling: https://api.authy.com/protected/json/phones/verification/start');

  axios({
    method: 'post',
    url: 'https://api.authy.com/protected/json/phones/verification/start',
    headers: { 'X-Authy-API-Key': process.env.TWILIO_API_KEY },
    data: {
      via: 'sms',
      phone_number,
      country_code: 61,
    },
  })
    .then(twilioResponse => {
      twilioDebug(`response: ${JSON.stringify(twilioResponse.data)}`);

      if (twilioResponse.data.success) {
        res.sendStatus(httpStatus.OK);
      } else {
        // fall through to catch
        throw 'response is not successful';
      }
    })
    .catch(twilioError => {
      twilioDebug(`error: ${twilioError}`);

      const apiError = new APIError(
        "Couldn't send SMS message, please try again",
        httpStatus.INTERNAL_SERVER_ERROR,
        true,
      );

      next(apiError);
    });
});

// verify the verification code with twilio
// twilio doc: https://www.twilio.com/docs/verify/api/verification
router.get('/phone-verification/check', (req, res, next) => {
  const { phone_number, verification_code } = req.query;

  twilioDebug('calling: https://api.authy.com/protected/json/phones/verification/check');

  axios({
    method: 'get',
    url: 'https://api.authy.com/protected/json/phones/verification/check',
    headers: { 'X-Authy-API-Key': process.env.TWILIO_API_KEY },
    data: {
      country_code: 61,
      phone_number,
      verification_code,
    },
  })
    .then(twilioResponse => {
      twilioDebug(`response: ${JSON.stringify(twilioResponse.data)}`);

      if (twilioResponse.data.success) {
        res.sendStatus(httpStatus.OK);
      } else {
        // fall through to catch
        throw 'response is not successful';
      }
    })
    .catch(twilioError => {
      twilioDebug(`error: ${twilioError}`);

      const apiError = new APIError(
        "Couldn't verify your phone, please try again",
        httpStatus.UNAUTHORIZED,
        true,
      );

      next(apiError);
    });
});

module.exports = router;
