const mongoose = require('mongoose');
require('mongoose-geojson-schema');

const zoneSchema = new mongoose.Schema(
  {
    polygon: { type: mongoose.Schema.Types.Polygon, required: true },
    active: { type: Boolean, required: true, default: false },
    riding: { type: Boolean, required: true, default: true }, // no-riding zone = no-parking and speed 1
    parking: { type: Boolean, required: true, default: false },
    speedMode: { type: Number, required: true, default: 0 }, // see Vehicle model
    note: { type: String },
  },
  { timestamps: true, versionKey: false }
).index({ polygon: '2dsphere' });

module.exports = mongoose.model('Zone', zoneSchema);
