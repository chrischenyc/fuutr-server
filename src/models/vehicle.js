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
    remainderRange: { type: Number },
    totalRidingSecs: { type: Number },
    location: { type: mongoose.Schema.Types.Point },
    altitude: { type: Number },
    statusUtcTime: { type: Date }, // vehicle status info's UTC time
    gpsUtcTime: { type: Date }, // GPS get the location's UTC time

    // -------- business logic --------
    unlockCode: { type: String, required: true, unique: true },
    unlockQRImage: { type: String, required: true },
    reserved: { type: Boolean, required: true, default: false },
    reservedAt: { type: Date },
    reservedBy: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true, versionKey: false }
).index({ location: '2dsphere' });

module.exports = mongoose.model('Vehicle', vehicleSchema);
