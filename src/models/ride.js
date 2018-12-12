const mongoose = require('mongoose');
require('mongoose-geojson-schema');

const rideSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      select: false,
    },
    vehicle: { type: mongoose.Schema.Types.ObjectId },
    unlockTime: { type: Date, required: true, default: Date.now },
    lockTime: { type: Date },
    unlockLocation: { type: mongoose.Schema.Types.Point, select: false },
    lockLocation: { type: mongoose.Schema.Types.Point, select: false },
    route: { type: mongoose.Schema.Types.LineString },
    encodedPath: { type: String },
    duration: { type: Number, required: true, default: 0 },
    distance: { type: Number, required: true, default: 0 },
    completed: { type: Boolean, required: true, default: false },
    unlockCost: { type: Number },
    minuteCost: { type: Number },
    totalCost: { type: Number },
  },
  { timestamps: true, versionKey: false }
).index({ lockLocation: '2dsphere', unlockLocation: '2dsphere', route: '2dsphere' });

module.exports = mongoose.model('Ride', rideSchema);
