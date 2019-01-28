const _ = require('lodash');

const Vehicle = require('../models/vehicle');
const logger = require('../helpers/logger');

const updateVehicleStatus = async (vehicleCode, iotCode, status) => {
  const { longitude, latitude } = status;

  let newDoc = _.omit(status, ['signature', 'vehicleCode', 'iotCode', 'longitude', 'latitude']);

  if (longitude && latitude) {
    logger.info(
      `Update vehicle code ${vehicleCode} iot code ${iotCode} GPS: ${latitude}/${longitude}`
    );
    newDoc = {
      ...newDoc,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
    };
  }

  const newVehicle = await Vehicle.findOneAndUpdate(
    { vehicleCode, iotCode },
    {
      $set: newDoc,
    }
  );

  return newVehicle;
};

module.exports = updateVehicleStatus;
