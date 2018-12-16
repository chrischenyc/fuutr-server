const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const logger = require('./logger');

// configuring the AWS environment
AWS.config.update({
  accessKeyId: process.env.AWS_S3_KEY,
  secretAccessKey: process.env.AWS_S3_SECRET,
});

const s3 = new AWS.S3();

const S3Upload = async (filePath) => {
  const params = {
    Body: fs.createReadStream(filePath),
    Key: path.basename(filePath),
    Bucket: process.env.AWS_S3_BUCKET_NAME,
  };

  try {
    const result = await new Promise((resolve, reject) => {
      s3.upload(params, (err, data) => {
        if (err) {
          reject(err);
        }

        if (data) {
          resolve(data);
        } else {
          reject(new Error("didn't get response from S3"));
        }
      });
    });

    logger.debug('S3 Uploaded:', result.Location);

    const s3Host = `${params.Bucket}.s3.amazonaws.com`;

    // save cloud front url
    return result.Location.replace(s3Host, process.env.AWS_S3_CLOUD_FRONT_NAME);
  } catch (error) {
    logger.err(`S3 Upload error: ${error}`);
    return null;
  }
};

module.exports = S3Upload;
