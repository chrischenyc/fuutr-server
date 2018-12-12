const mongoose = require('mongoose');
const util = require('util');
const axios = require('axios');
const Promise = require('bluebird');

// configs should be imported before importing any other file
require('./config/env');
require('./config/passport');

const app = require('./app');
const logger = require('./helpers/logger');
const { requestAccessToken, segwayClient } = require('./controllers/segway');

// debug output with nice prefix
const { databaseDebug, axiosDebug } = require('./helpers/debug-loggers');

const Ride = require('./models/ride');
const Vehicle = require('./models/vehicle');

// plugin bluebird promise in mongoose
mongoose.Promise = Promise;

// connect to mongo db
const mongoUri = process.env.MONGO_URI;
mongoose.connect(
  mongoUri,
  { useNewUrlParser: true, useCreateIndex: true }
);

mongoose.connection.on('error', () => {
  throw new Error(`unable to connect to database: ${mongoUri}`);
});

if (process.env.NODE_ENV === 'development') {
  // print mongoose logs in dev env
  mongoose.set('debug', (collectionName, method, query, doc) => {
    databaseDebug(`${collectionName}.${method}`, util.inspect(query, false, 20), doc);
  });

  // print axios requests in dev env
  axios.interceptors.request.use((request) => {
    axiosDebug(`${request.url} ${JSON.stringify(request.data)}`);

    return request;
  });

  segwayClient.interceptors.request.use((request) => {
    axiosDebug(`${request.method} ${request.baseURL}${request.url}`);

    return request;
  });
}

const port = process.env.PORT;
app.listen(port, () => {
  logger.info(`server started on port ${port}`);

  requestAccessToken();

  Ride.find({ scooter: { $exists: 1 } }).then((rides) => {
    rides.forEach((ride) => {
      ride.vehicle = ride.scooter;
      ride.scooter = undefined;
      ride.save();
    });
  });

  Ride.find({ vehicleCode: { $exists: 1 } }).then((rides) => {
    rides.forEach((ride) => {
      ride.vehicleCode = undefined;
      ride.save();
    });
  });

  Vehicle.findOne({})
    .exec()
    .then((vehicle) => {
      if (!vehicle) {
        Vehicle.create({ iotCode: '1111', vehicleCode: '1111' });
      }
    });
});

module.exports = app;
