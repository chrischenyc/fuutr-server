const httpStatus = require('http-status');
const _ = require('lodash');

const User = require('../models/user');
const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');

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
      balance: 1,
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

  const { displayName } = req.body;

  if (_.isNil(displayName)) {
    res.status(httpStatus.BAD_REQUEST).send();
  }

  User.findOne({ _id })
    .exec()
    .then((user) => {
      if (user) {
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

exports.updateEmail = (req, res, next) => {
  const { userId: _id } = req;

  if (!_id) {
    res.status(httpStatus.UNAUTHORIZED);
  }

  const { email } = req.body;

  User.findOne({ email, _id: { $ne: _id } })
    .exec()
    .then((userWithSameEmail) => {
      if (userWithSameEmail) {
        throw new APIError('Email is taken', httpStatus.FORBIDDEN, true);
      }

      return User.findOne({ _id }).exec();
    })
    .then((user) => {
      if (user) {
        const { email: previousEmail } = user;
        // TODO: send email alert to previousEmail

        user.email = email;
        // TODO: send verification email to new email

        return user.save();
      }

      return res.status(httpStatus.NO_CONTENT).send();
    })
    .then(() => res.status(httpStatus.OK).send())
    .catch((error) => {
      if (error instanceof APIError) {
        next(error);
      } else {
        logger.error(error);
        next(
          new APIError(`Couldn't update email to ${email}`, httpStatus.INTERNAL_SERVER_ERROR, true)
        );
      }
    });
};

exports.updatePhone = (req, res, next) => {
  const { userId: _id } = req;
  const { phoneNumber, countryCode } = req.body;

  User.findOne({ phoneNumber, countryCode, _id: { $ne: _id } })
    .exec()
    .then((userWithSamePhone) => {
      if (userWithSamePhone) {
        throw new APIError(`Phone number ${phoneNumber} is taken`, httpStatus.FORBIDDEN, true);
      }

      return User.findOne({ _id }).exec();
    })
    .then((user) => {
      if (user) {
        const { phoneNumber: previousPhoneNumber, countryCode: previousCountryCode } = user;
        // TODO: send SMS alert to previousPhoneNumber

        user.phoneNumber = phoneNumber;
        user.countryCode = countryCode;
        // TODO: send SMS to new number

        return user.save();
      }

      return res.status(httpStatus.NO_CONTENT).send();
    })
    .then(() => res.status(httpStatus.OK).send())
    .catch((error) => {
      if (error instanceof APIError) {
        next(error);
      } else {
        logger.error(error);

        next(
          new APIError(
            `Couldn't update phone to ${phoneNumber}`,
            httpStatus.INTERNAL_SERVER_ERROR,
            true
          )
        );
      }
    });
};
