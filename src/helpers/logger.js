const winston = require('winston');
const CloudWatchTransport = require('winston-aws-cloudwatch');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// If we're not in production then log to the `console` too
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    })
  );
}

// log to CloudWatch when in staging or production
if (process.env.NODE_ENV === 'staging' || process.env.NODE_ENV === 'production') {
  logger.add(
    new CloudWatchTransport({
      logGroupName: process.env.AWS_CLOUD_WATCH_GROUP,
      logStreamName: process.env.AWS_CLOUD_WATCH_STREAM,
      createLogGroup: true,
      createLogStream: true,
      submissionInterval: 2000,
      submissionRetryCount: 1,
      batchSize: 20,
      awsConfig: {
        accessKeyId: process.env.AWS_CLOUD_WATCH_ACCESS_KEY,
        secretAccessKey: process.env.AWS_CLOUD_WATCH_ACCESS_SECRET,
        region: process.env.AWS_REGION,
      },
      formatLog: item => `${item.level}: ${item.message} ${JSON.stringify(item.meta)}`,
    })
  );
}

module.exports = logger;
