const httpStatus = require('http-status');
const _ = require('lodash');

const User = require('../models/user');
const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');

exports.getProfile = async (req, res) => {
  const { userId: _id } = req;

  if (!_id) {
    res.status(httpStatus.UNAUTHORIZED);
    return;
  }

  const user = await User.findOne({ _id })
    .select({
      email: 1,
      phoneNumber: 1,
      countryCode: 1,
      displayName: 1,
      photo: 1,
      balance: 1,
      canReserveVehicleAfter: 1,
    })
    .exec();

  if (!user) {
    res.status(httpStatus.UNAUTHORIZED).send();
    return;
  }

  res.json(user);
};

exports.updateProfile = async (req, res) => {
  const { userId: _id } = req;
  if (!_id) {
    res.status(httpStatus.UNAUTHORIZED);
  }

  const { displayName } = req.body;

  try {
    const user = await User.findOne({ _id }).exec();

    if (!user) {
      res.status(httpStatus.NO_CONTENT).send();
      return;
    }

    if (!_.isNil(displayName)) {
      user.displayName = displayName;
    }

    await user.save();
    res.status(httpStatus.OK).send();
  } catch (error) {
    logger.error(error.message);
    res.status(httpStatus.UNAUTHORIZED).send();
  }
};

exports.updateEmail = async (req, res, next) => {
  const { userId: _id } = req;
  if (!_id) {
    res.status(httpStatus.UNAUTHORIZED);
  }

  const { email } = req.body;

  try {
    const userWithSameEmail = await User.findOne({ email, _id: { $ne: _id } }).exec();

    if (userWithSameEmail) {
      next(new APIError('Email is taken', httpStatus.FORBIDDEN, true));
      return;
    }

    const user = await User.findOne({ _id }).exec();

    if (!user) {
      res.status(httpStatus.NO_CONTENT).send();
      return;
    }

    user.email = email;

    await user.save();

    res.status(httpStatus.OK).send();
  } catch (error) {
    logger.error(error.message);
    next(new APIError(`Couldn't update email to ${email}`, httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};

exports.updatePhone = async (req, res, next) => {
  const { userId: _id } = req;
  const { phoneNumber, countryCode } = req.body;

  try {
    const userWithSamePhone = await User.findOne({
      phoneNumber,
      countryCode,
      _id: { $ne: _id },
    }).exec();

    if (userWithSamePhone) {
      next(APIError(`Phone number ${phoneNumber} is taken`, httpStatus.FORBIDDEN, true));
      return;
    }

    const user = await User.findOne({ _id }).exec();

    if (!user) {
      res.status(httpStatus.NO_CONTENT).send();
      return;
    }

    user.phoneNumber = phoneNumber;
    user.countryCode = countryCode;

    await user.save();

    res.status(httpStatus.OK).send();
  } catch (error) {
    logger.error(error.message);

    next(
      new APIError(
        `Couldn't update phone to ${phoneNumber}`,
        httpStatus.INTERNAL_SERVER_ERROR,
        true
      )
    );
  }
};
