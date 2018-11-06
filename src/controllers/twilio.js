const httpStatus = require('http-status');
const axios = require('axios');

const APIError = require('../helpers/api-error');

module.exports = {
  // twilio doc: https://www.twilio.com/docs/verify/api/verification
  startPhoneVerification: (req, res, next) => {
    const { phone_number, country_code } = req.body;

    axios({
      method: 'post',
      url: 'https://api.authy.com/protected/json/phones/verification/start',
      headers: { 'X-Authy-API-Key': process.env.TWILIO_API_KEY },
      data: {
        via: 'sms',
        phone_number,
        country_code,
      },
    })
      .then((result) => {
        if (result.data.success) {
          res.sendStatus(httpStatus.OK);
        } else {
          throw Error('twilio response is not successful');
        }
      })
      .catch(() => {
        next(
          new APIError(
            "Couldn't send SMS message. Please try again.",
            httpStatus.INTERNAL_SERVER_ERROR,
            true
          )
        );
      });
  },

  // twilio doc: https://www.twilio.com/docs/verify/api/verification
  checkPhoneVerification: (req, res, next) => {
    const { phone_number, country_code, verification_code } = req.body;

    axios({
      method: 'get',
      url: 'https://api.authy.com/protected/json/phones/verification/check',
      headers: { 'X-Authy-API-Key': process.env.TWILIO_API_KEY },
      data: {
        country_code,
        phone_number,
        verification_code,
      },
    })
      .then((response) => {
        if (response.data.success) {
          next();
        } else {
          throw Error('twilio response is not successful');
        }
      })
      .catch((err) => {
        next(
          new APIError(
            `${err.response.data.message || "Couldn't verify your code."} Please try again.`,
            httpStatus.UNAUTHORIZED,
            true
          )
        );
      });
  },
};
