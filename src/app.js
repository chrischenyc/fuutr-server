const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const expressWinston = require('express-winston');
const httpStatus = require('http-status');
const expressValidation = require('express-validation');

const routes = require('./routes');
const config = require('./config');
const APIError = require('./helpers/APIError');

const app = express();

if (config.env === 'development') {
  app.use(morgan('dev'));
}

// parse body params and attache them to req.body
app.use(bodyParser.json()); // support Content-Type = application/json
app.use(bodyParser.urlencoded({ extended: false })); // support form data

// compress response body
app.use(compression());

// secure apps by setting various HTTP headers
app.use(helmet());

// enable CORS - Cross Origin Resource Sharing
app.use(cors());

// express-winston logger BEFORE the router
if (config.env !== 'production') {
  app.use(
    expressWinston.logger({
      transports: [new winston.transports.Console()],
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
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
if (config.env !== 'test') {
  let format = winston.format.combine(winston.format.colorize(), winston.format.simple());

  if (config.env === 'development') {
    expressWinston.requestWhitelist.push('body');
    format = winston.format.combine(winston.format.colorize(), winston.format.prettyPrint());
  }

  app.use(
    expressWinston.errorLogger({
      transports: [new winston.transports.Console()],
      format,
      colorize: true,
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
