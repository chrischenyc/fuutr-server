const httpStatus = require('http-status');

const User = require('../models/user');

exports.getProfile = (req, res) => {
  const { userId: _id } = req;

  if (!_id) {
    res.status(httpStatus.UNAUTHORIZED);
    return;
  }

  User.findOne({ _id })
    .select({
      email: 1,
      phoneNumber: 1,
      countryCode: 1,
      displayName: 1,
      photo: 1,
    })
    .exec()
    .then((user) => {
      if (user) {
        req.user = user;
        return res.json(user);
      }

      return res.status(httpStatus.UNAUTHORIZED).send();
    })
    .catch(() => {
      res.status(httpStatus.UNAUTHORIZED).send();
    });
};
