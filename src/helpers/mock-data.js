const uuid = require('uuid');

const randomFromInterval = (min, max) => Math.random() * (max - min + 1) + min;

exports.mockScooters = (latitude, longitude, radius) => {
  const latitudeFloat = parseFloat(latitude);
  const longitudeFloat = parseFloat(longitude);
  const radiusFloat = parseFloat(radius);

  // filter invalid coordinates
  if (latitudeFloat < -90 || latitudeFloat > 90 || longitudeFloat < -180 || longitudeFloat > 180) {
    return [];
  }

  const scooters = [];
  const numberOfScooters = randomFromInterval(100, 500);
  const latitudeOffset = radiusFloat / 110.574;
  const longitudeOffset = radiusFloat / (111.32 * Math.cos(latitudeFloat));

  while (scooters.length < numberOfScooters) {
    scooters.push({
      iotCode: uuid.v4().split('-')[0],
      vehicleCode: uuid.v4().split('-')[0],
      powerPercent: Math.floor(randomFromInterval(10, 100)),
      latitude: randomFromInterval(latitudeFloat - latitudeOffset, latitudeFloat + latitudeOffset),
      longitude: randomFromInterval(
        longitudeFloat - longitudeOffset,
        longitudeFloat + longitudeOffset
      ),
    });
  }

  console.log(scooters);

  return scooters;
};
