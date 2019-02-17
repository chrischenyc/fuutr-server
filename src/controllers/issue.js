const httpStatus = require('http-status');

const Issue = require('../models/issue');

const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');

exports.addIssue = async (req, res, next) => {
  const {
    type, description, latitude, longitude, vehicle, ride,
  } = req.body;
  const { userId } = req;

  try {
    // create Issue object
    const issue = new Issue({
      type,
      user: userId,
      description,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      vehicle,
      ride,
    });

    await issue.save();

    res.status(httpStatus.CREATED).send();
  } catch (error) {
    logger.error(`POST /issues error: ${JSON.stringify(error)}`);
    next(new APIError("couldn't submit issue", httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
