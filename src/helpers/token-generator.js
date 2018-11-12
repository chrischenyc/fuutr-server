const jwt = require('jsonwebtoken');
const uuid = require('uuid');
const RefreshToken = require('../models/refresh-token');

const generateAccessToken = (user) => {
  const { _id } = user;
  return {
    accessToken: jwt.sign({ _id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    }),
  };
};
exports.generateAccessToken = generateAccessToken;

exports.generateTokens = (user) => {
  const { accessToken } = generateAccessToken(user);
  const refreshToken = uuid.v4();

  const record = new RefreshToken({ token: refreshToken, userId: user._id });
  record.save();

  return {
    accessToken,
    refreshToken,
  };
};

exports.fourDigitsToken = () => {
  const number = Math.floor(100000 + Math.random() * 900000);
  return String(number).substring(0, 4);
};
