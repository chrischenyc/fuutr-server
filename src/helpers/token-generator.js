const jwt = require('jsonwebtoken');

exports.sign = (user) => {
  const { _id } = user;
  return {
    accessToken: jwt.sign({ _id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    }),
    // refreshToken: 'todo',
  };
};
