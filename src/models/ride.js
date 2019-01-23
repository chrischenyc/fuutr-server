const mongoose = require('mongoose');
require('mongoose-geojson-schema');

const rideSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, required: true },

    unlockCost: { type: Number, required: true },
    rideMinuteCost: { type: Number, required: true },
    pauseMinuteCost: { type: Number, required: true },

    unlockTime: { type: Date, required: true, default: Date.now },
    unlockLocation: { type: mongoose.Schema.Types.Point },

    // user can pause/resume a ride
    segments: {
      type: [
        {
          start: { type: Date, required: true },
          end: { type: Date },
          paused: { type: Boolean, required: true },
          cost: { type: Number },
        },
      ],
    },

    lockTime: { type: Date },
    lockLocation: { type: mongoose.Schema.Types.Point },

    route: { type: mongoose.Schema.Types.LineString },
    encodedPath: { type: String },

    duration: { type: Number, required: true, default: 0 },
    distance: { type: Number, required: true, default: 0 },
    paused: { type: Boolean, required: true, default: false },
    pausedUntil: { type: Date },
    pauseTimeoutKey: { type: String },
    completed: { type: Boolean, required: true, default: false },
    totalCost: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, versionKey: false }
).index({ lockLocation: '2dsphere', unlockLocation: '2dsphere', route: '2dsphere' });

module.exports = mongoose.model('Ride', rideSchema);
