const express = require('express');
const httpStatus = require('http-status');

const APIError = require('../helpers/APIError');

const router = express.Router();

// request a verification code to be sent to mobile number
router.get('/phone-verification/start', (req, res, next) => {
  const { mobile } = req.query;

  // TODO: call Twilio API
  // res.send({ message: 'test' });

  const error = new APIError('not implemented yet', httpStatus.NOT_IMPLEMENTED, true);
  next(error);
});

module.exports = router;
