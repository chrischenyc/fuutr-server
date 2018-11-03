const express = require('express');

const router = express.Router();

// GET /api/phone-verification/start?mobile=0412345678
// request a verification code to be sent to mobile number
router.get('/phone-verification/start', (req, res) => {
  const { mobile } = req.query;

  // TODO: call Twilio API
  res.send({ message: 'test' });
});

module.exports = router;
