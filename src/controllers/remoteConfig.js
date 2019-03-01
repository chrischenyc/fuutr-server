exports.getRemoteConfig = async (req, res) => {
  // TODO: need to localise pricing

  const config = {
    unlockCost: parseFloat(process.env.APP_UNLOCK_COST),
    rideMinuteCost: parseFloat(process.env.APP_RIDE_MINUTE_COST),
    pauseMinuteCost: parseFloat(process.env.APP_PAUSE_MINUTE_COST),
  };

  res.json(config);
};
