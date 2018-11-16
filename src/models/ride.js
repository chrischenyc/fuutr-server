const mongoose = require('mongoose');

const GeoSchema = require('./geo-schema');

const RideCostSchema = new mongoose.Schema({
  unlockCost: { type: Number },
  rideCost: { type: Number },
  total: { type: Number },
  paidBy: { type: String }, // "balance", "subscription", "free"
});

const rideSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    scooter: { type: mongoose.Schema.Types.ObjectId, required: true },
    unlockTime: { type: Date, required: true, default: Date.now },
    lockTime: { type: Date },
    unlockLocation: { type: GeoSchema, required: true }, // POINT
    lockLocation: { type: GeoSchema }, // POINT
    route: { type: GeoSchema }, // MultiPoint
    duration: { type: Number, required: true, default: 0 },
    distance: { type: Number, required: true, default: 0 },
    completed: { type: Boolean, required: true },
    cost: { type: RideCostSchema },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Ride', rideSchema);
