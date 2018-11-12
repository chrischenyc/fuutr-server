const uuid = require('uuid');

const randomFromInterval = (min, max) => Math.random() * (max - min + 1) + min;

exports.mockScooters = (latitude, longitude, radius) => {
  const latitudeFloat = parseFloat(latitude);
  const longitudeFloat = parseFloat(longitude);
  const radiusFloat = parseFloat(radius);

  const numberOfScooters = Math.floor(radiusFloat * randomFromInterval(1, 9));
  const scooters = [];

  while (scooters.length < numberOfScooters) {
    scooters.push({
      iotCode: uuid.v4().split('-')[0],
      vehicleCode: uuid.v4().split('-')[0],
      powerPercent: Math.floor(randomFromInterval(10, 100)),
      latitude: randomFromInterval(
        latitudeFloat - radiusFloat / 110.574,
        latitudeFloat + radiusFloat / 110.574
      ),
      longitude: randomFromInterval(
        longitudeFloat - 111.32 * Math.cos(latitudeFloat),
        longitudeFloat + 111.32 * Math.cos(latitudeFloat)
      ),
    });
  }

  return scooters;
};
