module.exports = (coordinates) => {
  let distance = 0;
  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const coordinate1 = coordinates[index];
    const coordinate2 = coordinates[index + 1];

    distance += distanceBetween(coordinate1[1], coordinate1[0], coordinate2[1], coordinate2[0]);
  }

  return distance;
};

function distanceBetween(lat1, lon1, lat2, lon2) {
  const p = 0.017453292519943295; // Math.PI / 180
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p) / 2 + (c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))) / 2;

  return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}
