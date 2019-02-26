exports.getRemoteConfig = async (req, res) => {
  // TODO: need to localise pricing

  const config = {
    unlockCost: parseFloat(process.env.APP_UNLOCK_COST_NZ),
    rideMinuteCost: parseFloat(process.env.APP_RIDE_MINUTE_COST_NZ),
    pauseMinuteCost: parseFloat(process.env.APP_PAUSE_MINUTE_COST_NZ),
  };

  res.json(config);
};
