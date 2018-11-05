const mongoose = require('mongoose');

const scooterSchema = mongoose.Schema({
  iotCode: String,
  vehicleCode: String,
  iotVersion: String,
  vehicleControllerVersion: Number,
  vehicleDashboardVersion: Number,
  vehicleBuildInBatteryVersion: Number,
  vehiclePlugInBatteryVersion: Number,
  online: Boolean, // whether the device is connected to gateway
  locked: Boolean,
  lockVoltage: Number,
  networkSignal: Number,
  charging: Boolean,
  powerPercent: Number, // scooter battery percentage, 80 is 80%
  speedMode: Number, // speed mode (0: can't read; 1: low speed; 2: medium speed; 3: high speed;)
  speed: Number,
  odometer: Number, // total odometer since out of factory (unit is 10m, so 1230 means 12.3km)
  remainderRange: Number,
  totalRidingSecs: Number,
  statusUtcTime: Date, // scooter status info's UTC time
  latitude: mongoose.Schema.Types.Decimal128,
  longitude: mongoose.Schema.Types.Decimal128,
  satelliteNumber: Number,
  hdop: mongoose.Schema.Types.Decimal128, // GPS HDOP
  altitude: Number,
  gpsUtcTime: Date, // GPS get the location's UTC time
});

module.exports = mongoose.model('Scooter', scooterSchema);
