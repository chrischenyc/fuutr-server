const mongoose = require('mongoose');

const GeoSchema = require('./geo-schema');

const rideSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    scooter: { type: mongoose.Schema.Types.ObjectId, required: true },
    vehicleCode: { type: String, required: true },
    unlockTime: { type: Date, required: true, default: Date.now },
    lockTime: { type: Date },
    unlockLocation: { type: GeoSchema }, // POINT
    lockLocation: { type: GeoSchema }, // POINT
    route: { type: GeoSchema }, // MultiPoint
    duration: { type: Number, required: true, default: 0 },
    distance: { type: Number, required: true, default: 0 },
    completed: { type: Boolean, required: true, default: false },
    unlockCost: { type: Number },
    minuteCost: { type: Number },
    rideCost: { type: Number },
    totalCost: { type: Number },
    paidBy: { type: String }, // "balance", "subscription", "free"
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Ride', rideSchema);
