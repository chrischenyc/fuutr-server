const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const multerS3 = require('multer-s3');

const logger = require('./logger');
const { s3ToCouldFront } = require('./s3-cloud-front');

// configuring the AWS environment
AWS.config.update({
  accessKeyId: process.env.AWS_S3_KEY,
  secretAccessKey: process.env.AWS_S3_SECRET,
});

const s3 = new AWS.S3();

exports.uploadToS3 = async (filePath, bucket) => {
  const params = {
    Body: fs.createReadStream(filePath),
    Key: path.basename(filePath),
    Bucket: bucket,
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

    return s3ToCouldFront(result.Location, params.Bucket, process.env.AWS_S3_CLOUD_FRONT_QR);
  } catch (error) {
    logger.err(`S3 Upload error: ${error}`);
    return null;
  }
};

exports.riderUpload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_S3_BUCKET_RIDER,
    metadata(req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key(req, file, cb) {
      const { userId } = req;
      // file name on S3
      cb(null, `${Date.now().toString()}_${userId}_${file.originalname}`);
    },
  }),
});
