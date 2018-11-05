const express = require('express');
const morgan = require('morgan');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const expressWinston = require('express-winston');
const httpStatus = require('http-status');
const expressValidation = require('express-validation');

const routes = require('./routes');
const APIError = require('./helpers/api-error');

const app = express();

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// parse body params and attache them to req.body
app.use(express.json()); // support Content-Type = application/json
app.use(express.urlencoded({ extended: false })); // support form data

// compress response body
app.use(compression());

// secure apps by setting various HTTP headers
app.use(helmet());

// enable CORS - Cross Origin Resource Sharing
app.use(cors());

// express-winston logger BEFORE the router
if (process.env.NODE_ENV !== 'test') {
  app.use(
    expressWinston.logger({
      transports: [new winston.transports.Console()],
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.json(),
        winston.format.simple(),
      ),
    }),
  );
}

// mount all routes on /api path
app.use('/api', routes);

// if error is not an instanceOf APIError, convert it.
app.use((err, req, res, next) => {
  if (err instanceof expressValidation.ValidationError) {
    // validation error contains errors which is an array of error each containing message[]
    const unifiedErrorMessage = err.errors.map(error => error.messages.join('. ')).join(' and ');
    const error = new APIError(unifiedErrorMessage, err.status, true);
    return next(error);
  } else if (!(err instanceof APIError)) {
    const apiError = new APIError(err.message, err.status, err.isPublic);
    return next(apiError);
  }
  return next(err);
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new APIError('API not found', httpStatus.NOT_FOUND);
  next(err);
});

// express-winston error logger AFTER the router
if (process.env.NODE_ENV !== 'test') {
  if (process.env.NODE_ENV === 'development') {
    expressWinston.requestWhitelist.push('body');
  }

  app.use(
    expressWinston.errorLogger({
      transports: [new winston.transports.Console()],
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.json(),
        winston.format.simple(),
      ),
      msg: 'HTTP {{req.method}} {{req.url}}',
    }),
  );
}

// error handler
app.use((err, req, res, next) => {
  res.status(err.status).json({
    error: err.isPublic ? err.message : httpStatus[err.status],
  });
});

module.exports = app;