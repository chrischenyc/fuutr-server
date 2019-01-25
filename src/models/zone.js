const mongoose = require('mongoose');
require('mongoose-geojson-schema');

const zoneSchema = new mongoose.Schema(
  {
    polygon: { type: mongoose.Schema.Types.Polygon, required: true },
    active: { type: Boolean, required: true, default: false },
    parking: { type: Boolean, required: true, default: false },
    speedMode: { type: Number, required: true, default: 0 }, // speed mode (0: no restrict; 1: low speed; 2: medium speed; 3: high speed;)
    note: { type: String },
  },
  { timestamps: true, versionKey: false }
).index({ polygon: '2dsphere' });

module.exports = mongoose.model('Zone', zoneSchema);
