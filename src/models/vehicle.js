const mongoose = require('mongoose');
require('mongoose-geojson-schema');

const vehicleSchema = new mongoose.Schema(
  {
    unlockCode: { type: String, required: true, unique: true },
    unlockQRImage: { type: String, required: true },
    iotCode: { type: String, required: true, unique: true },
    vehicleCode: { type: String, required: true, unique: true },
    iotVersion: { type: String },
    vehicleControllerVersion: { type: Number },
    vehicleDashboardVersion: { type: Number },
    vehicleBuildInBatteryVersion: { type: Number },
    vehiclePlugInBatteryVersion: { type: Number },
    // whether the device is connected to gateway
    online: { type: Boolean, required: true, default: true },
    locked: { type: Boolean, required: true, default: true },
    lockVoltage: { type: Number },
    networkSignal: { type: Number },
    charging: { type: Boolean, required: true, default: false },
    // vehicle battery percentage, 80 is 80%
    powerPercent: { type: Number },
    // speed mode (0: can't read; 1: low speed; 2: medium speed; 3: high speed;)
    speedMode: { type: Number },
    speed: { type: Number },
    // total odometer since out of factory (unit is 10m, so 1230 means 12.3km)
    odometer: { type: Number },
    remainderRange: { type: Number },
    totalRidingSecs: { type: Number },
    location: { type: mongoose.Schema.Types.Point },
    altitude: { type: Number },
    satelliteNumber: { type: Number },
    hdop: { type: Number }, // GPS HDOP
    statusUtcTime: { type: Date }, // vehicle status info's UTC time
    gpsUtcTime: { type: Date }, // GPS get the location's UTC time
  },
  { timestamps: true, versionKey: false }
).index({ location: '2dsphere' });

module.exports = mongoose.model('Vehicle', vehicleSchema);
