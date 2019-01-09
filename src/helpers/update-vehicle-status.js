const _ = require('lodash');

const Vehicle = require('../models/vehicle');

const updateVehicleStatus = async (vehicleCode, iotCode, status) => {
  const { longitude, latitude } = status;

  let newDoc = _.omit(status, ['signature', 'vehicleCode', 'iotCode', 'longitude', 'latitude']);

  if (longitude && latitude) {
    newDoc = {
      ...newDoc,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
    };
  }

  await Vehicle.update(
    { vehicleCode, iotCode },
    {
      $set: newDoc,
    }
  );
};

module.exports = updateVehicleStatus;
