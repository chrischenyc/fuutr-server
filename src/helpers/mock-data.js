const uuid = require('uuid');

const randomFromInterval = (min, max) => Math.random() * (max - min + 1) + min;

exports.mockVehiclesInBound = (minLatitude, minLongitude, maxLatitude, maxLongitude) => {
  const vehicles = [];
  const numberOfVehicles = randomFromInterval(10, 20);

  while (vehicles.length < numberOfVehicles) {
    vehicles.push({
      iotCode: uuid.v4().split('-')[0],
      vehicleCode: uuid.v4().split('-')[0],
      powerPercent: randomFromInterval(0, 100),
      remainderRange: randomFromInterval(5, 50),
      latitude: minLatitude + (maxLatitude - minLatitude) * Math.random(),
      longitude: minLongitude + (maxLongitude - minLongitude) * Math.random(),
    });
  }

  return vehicles;
};
