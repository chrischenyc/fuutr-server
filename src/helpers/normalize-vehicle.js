// convert mongo document object to an object to be returned
module.exports = (vehicle, user) => {
  // TODO: need to localise pricing
  let result = {
    _id: vehicle._id,
    powerPercent: vehicle.powerPercent,
    remainingRange: vehicle.remainingRange,
    unlockCode: `#${vehicle.unlockCode}`,
    longitude: vehicle.location.coordinates[0],
    latitude: vehicle.location.coordinates[1],
    address: vehicle.address,
    reserved: vehicle.reserved,
    locked: vehicle.locked,
    inRide: vehicle.inRide,
    unlockCost: parseFloat(process.env.APP_UNLOCK_COST),
    rideMinuteCost: parseFloat(process.env.APP_RIDE_MINUTE_COST),
    pauseMinuteCost: parseFloat(process.env.APP_PAUSE_MINUTE_COST),
  };

  if (vehicle.reservedUntil) {
    result = { ...result, reservedUntil: vehicle.reservedUntil };
  }

  if (user.canReserveVehicleAfter && user.canReserveVehicleAfter > Date.now()) {
    result = { ...result, canReserveAfter: user.canReserveVehicleAfter };
  }

  return result;
};
