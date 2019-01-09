const mongoose = require('mongoose');
require('mongoose-geojson-schema');

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Contact', contactSchema);
