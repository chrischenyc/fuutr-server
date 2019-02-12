exports.getRemoteConfig = async (req, res) => {
  const config = {
    unlockCost: process.env.APP_UNLOCK_COST,
    rideMinuteCost: process.env.APP_RIDE_MINUTE_COST,
    pauseMinuteCost: process.env.APP_PAUSE_MINUTE_COST,
  };

  res.json(config);
};
