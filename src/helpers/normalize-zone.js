// convert mongo document object to an object to be returned
module.exports = (zone) => {
  const polygon = zone.polygon.coordinates[0];
  polygon.pop();

  let result = {
    riding: zone.riding,
    parking: zone.parking,
    speedMode: zone.speedMode,
    polygon,
  };

  if (!zone.riding) {
    result = {
      ...result,
      title: 'No-Riding Zone',
      message: 'You cannot ride or park the scooter in this area.',
    };
  } else if (!zone.parking) {
    result = {
      ...result,
      title: 'No-Parking Zone',
      message: 'You cannot end a ride in this area, please park in an accepted zone.',
    };
  } else if (zone.speedMode === 1 || zone.speedMode === 2) {
    result = {
      ...result,
      title: 'Geo-Fenced Speed Zone',
      message:
        'In high traffic locations like this one, Scooter top speed will be capped via our system. Please prepare to slow down in these areas.',
    };
  }

  return result;
};
