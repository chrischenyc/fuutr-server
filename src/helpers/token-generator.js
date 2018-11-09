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

const generateTokens = (user) => {
  const { accessToken } = generateAccessToken(user);
  const refreshToken = uuid.v4();

  const record = new RefreshToken({ token: refreshToken, userId: user._id });
  record.save();

  return {
    accessToken,
    refreshToken,
  };
};

exports.generateAccessToken = generateAccessToken;
exports.generateTokens = generateTokens;
