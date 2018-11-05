const express = require('express');
const httpStatus = require('http-status');
const axios = require('axios');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const router = express.Router();

const { twilioDebug } = require('../helpers/debug-loggers');
const APIError = require('../helpers/api-error');
const User = require('../models/user');

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
        // return matched User record or create a new one
        User.findOne({ mobile: phone_number })
          .exec()
          .then(user => {
            if (user) {
              res.json(user);
            } else {
              const user = new User({ mobile: phone_number });
              user
                .save()
                .then(doc => {
                  res.json(doc);
                })
                .catch(error => {
                  throw `couldn't create new User with mobile ${phone_number}`;
                });
            }
          })
          .catch(error => {
            throw `couldn't query User with mobile ${phone_number}`;
          });
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

// email sign up
router.post('/email/signup', (req, res, next) => {
  const { email, password } = req.body;

  User.findOne({ email })
    .exec()
    .then(user => {
      if (user) {
        const apiError = new APIError('Email is taken', httpStatus.UNPROCESSABLE_ENTITY, true);
        next(apiError);
      } else {
        bcrypt.hash(password, 10, (error, hash) => {
          if (error) {
            const apiError = new APIError(error, httpStatus.INTERNAL_SERVER_ERROR, false);
            next(apiError);
          } else {
            const user = new User({ email, password: hash });
            user
              .save()
              .then(result => {
                // JWT
                const token = jwt.sign({ id: result._id, email }, process.env.JWT_SECRET, {
                  expiresIn: '1h',
                });
                res.status(httpStatus.CREATED).json({ token });
              })
              .catch(error => {
                const apiError = new APIError(error, httpStatus.INTERNAL_SERVER_ERROR, false);
                next(apiError);
              });
          }
        });
      }
    })
    .catch(error => {
      const apiError = new APIError('Cannot query user', httpStatus.INTERNAL_SERVER_ERROR, false);
      next(apiError);
    });
});

// email log in
router.post('/email/login', (req, res, next) => {});

module.exports = router;
