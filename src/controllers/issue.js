const httpStatus = require('http-status');
const _ = require('lodash');

const Issue = require('../models/issue');

const APIError = require('../helpers/api-error');
const logger = require('../helpers/logger');
const { s3ToCouldFront } = require('../helpers/s3');

exports.addIssue = async (req, res, next) => {
  const {
    type, description, latitude, longitude, vehicle, ride,
  } = req.body;
  const { userId, file } = req;

  try {
    // create Issue object
    const issue = new Issue({
      type,
      user: userId,
      description,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      vehicle,
      ride,
    });

    if (!_.isNil(file.location)) {
      issue.photo = s3ToCouldFront(
        file.location,
        process.env.AWS_S3_BUCKET_RIDER,
        process.env.AWS_S3_CLOUD_FRONT_RIDER
      );
    }

    await issue.save();

    res.status(httpStatus.CREATED).send();
  } catch (error) {
    logger.error(`POST /issues error: ${JSON.stringify(error)}`);
    next(new APIError("couldn't submit issue", httpStatus.INTERNAL_SERVER_ERROR, true));
  }
};
