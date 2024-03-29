const mongoose = require('mongoose');
require('mongoose-geojson-schema');

const vehicleSchema = new mongoose.Schema(
  {
    // -------- from segway --------
    iotCode: { type: String, required: true, unique: true },
    vehicleCode: { type: String, required: true, unique: true },
    online: { type: Boolean, required: true, default: true }, // is IoT online
    locked: { type: Boolean, required: true, default: true },
    networkSignal: { type: Number },
    charging: { type: Boolean, required: true, default: false },
    powerPercent: { type: Number }, // vehicle battery percentage, 80 is 80%
    speedMode: { type: Number }, // speed mode (0: can't read; 1: low speed; 2: medium speed; 3: high speed;)
    speed: { type: Number },
    odometer: { type: Number }, // total odometer since out of factory (unit is 10m, so 1230 means 12.3km)
    remainingRange: { type: Number }, // unit is 10m
    totalRidingSecs: { type: Number },
    altitude: { type: Number },
    statusUtcTime: { type: Date }, // vehicle status info's UTC time
    gpsUtcTime: { type: Date }, // GPS get the location's UTC time

    // -------- business logic --------
    location: { type: mongoose.Schema.Types.Point },
    unlockCode: { type: String, required: true, unique: true },
    unlockQRImage: { type: String, required: true },
    reserved: { type: Boolean, required: true, default: false },
    reservedBy: { type: mongoose.Schema.Types.ObjectId },
    reservedUntil: { type: Date },
    reserveTimeoutKey: { type: String },
    inRide: { type: Boolean, required: true, default: false },
    address: { type: String }, // reverse-geo location, updated during receiving segway push
  },
  { timestamps: true, versionKey: false }
).index({ location: '2dsphere' });

module.exports = mongoose.model('Vehicle', vehicleSchema);
