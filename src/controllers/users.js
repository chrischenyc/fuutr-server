const httpStatus = require('http-status');
const _ = require('lodash');
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

exports.updateProfile = (req, res) => {
  const { userId: _id } = req;

  if (!_id) {
    res.status(httpStatus.UNAUTHORIZED);
  }

  const { email, displayName } = req.body;

  if (_.isNil(email) && _.isNil(displayName)) {
    res.status(httpStatus.BAD_REQUEST).send();
  }

  User.findOne({ _id })
    .exec()
    .then((user) => {
      if (user) {
        if (!_.isNil(email)) {
          user.email = email;
        }

        if (!_.isNil(displayName)) {
          user.displayName = displayName;
        }

        return user.save();
      }

      return res.status(httpStatus.NO_CONTENT).send();
    })
    .then(() => {
      res.status(httpStatus.OK).send();
    })
    .catch(() => {
      res.status(httpStatus.UNAUTHORIZED).send();
    });
};
