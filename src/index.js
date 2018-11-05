const mongoose = require('mongoose');
const util = require('util');

// config should be imported before importing any other file
require('./config');

const app = require('./app');

// debug output with nice prefix
const { databaseDebug } = require('./helpers/debug-loggers');

// make bluebird default Promise
Promise = require('bluebird');

// plugin bluebird promise in mongoose
mongoose.Promise = Promise;

// connect to mongo db
const mongoUri = process.env.MONGO_URI;
mongoose.connect(
  mongoUri,
  { useNewUrlParser: true, useCreateIndex: true },
);

mongoose.connection.on('error', () => {
  throw new Error(`unable to connect to database: ${mongoUri}`);
});

// print mongoose logs in dev env
if (process.env.NODE_ENV === 'development') {
  mongoose.set('debug', (collectionName, method, query, doc) => {
    databaseDebug(`${collectionName}.${method}`, util.inspect(query, false, 20), doc);
  });
}

// module.parent check is required to support mocha watch
// src: https://github.com/mochajs/mocha/issues/1912
if (!module.parent) {
  const port = process.env.PORT;
  app.listen(port, () => {
    console.info(`server started on port ${port}`);
  });
}

module.exports = app;
