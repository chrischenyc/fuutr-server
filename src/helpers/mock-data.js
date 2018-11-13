const uuid = require('uuid');

const randomFromInterval = (min, max) => Math.random() * (max - min + 1) + min;

exports.mockScootersInBound = (minLatitude, minLongitude, maxLatitude, maxLongitude) => {
  const scooters = [];
  const numberOfScooters = randomFromInterval(10, 20);

  while (scooters.length < numberOfScooters) {
    scooters.push({
      iotCode: uuid.v4().split('-')[0],
      vehicleCode: uuid.v4().split('-')[0],
      powerPercent: Math.floor(randomFromInterval(0, 100)),
      latitude: minLatitude + (maxLatitude - minLatitude) * Math.random(),
      longitude: minLongitude + (maxLongitude - minLongitude) * Math.random(),
    });
  }

  return scooters;
};
