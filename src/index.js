const mongoose = require('mongoose');
const util = require('util');
const axios = require('axios');
const Promise = require('bluebird');

// config should be imported before importing any other file
require('./config');

const app = require('./app');

// debug output with nice prefix
const { databaseDebug, axiosDebug } = require('./helpers/debug-loggers');

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
}

const port = process.env.PORT;
app.listen(port, () => {
  console.info(`server started on port ${port}`); // eslint-disable-line no-console
});

module.exports = app;
