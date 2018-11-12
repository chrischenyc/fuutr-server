const mongoose = require('mongoose');

const scooterSchema = new mongoose.Schema(
  {
    iotCode: { type: String },
    vehicleCode: { type: String },
    iotVersion: { type: String },
    vehicleControllerVersion: { type: Number },
    vehicleDashboardVersion: { type: Number },
    vehicleBuildInBatteryVersion: { type: Number },
    vehiclePlugInBatteryVersion: { type: Number },
    // whether the device is connected to gateway
    online: { type: Boolean },
    locked: { type: Boolean },
    lockVoltage: { type: Number },
    networkSignal: { type: Number },
    charging: { type: Boolean },
    // scooter battery percentage, 80 is 80%
    powerPercent: { type: Number },
    // speed mode (0: can't read; 1: low speed; 2: medium speed; 3: high speed;)
    speedMode: { type: Number },
    speed: { type: Number },
    // total odometer since out of factory (unit is 10m, so 1230 means 12.3km)
    odometer: { type: Number },
    remainderRange: { type: Number },
    totalRidingSecs: { type: Number },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    altitude: { type: Number },
    satelliteNumber: { type: Number },
    hdop: { type: Number }, // GPS HDOP
    statusUtcTime: { type: Date }, // scooter status info's UTC time
    gpsUtcTime: { type: Date }, // GPS get the location's UTC time
  },
  { timestamps: true }
);

module.exports = mongoose.model('Scooter', scooterSchema);
