const mongoose = require('mongoose');
require('mongoose-geojson-schema');

const issueSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    description: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    location: { type: mongoose.Schema.Types.Point },
    vehicle: { type: mongoose.Schema.Types.ObjectId },
    ride: { type: mongoose.Schema.Types.ObjectId },
    photo: { type: String },
  },
  { timestamps: true, versionKey: false }
).index({ location: '2dsphere' });

module.exports = mongoose.model('Issue', issueSchema);
