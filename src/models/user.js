const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true },
    password: { type: String },
    phone_number: { type: String },
    country_code: { type: Number },
    facebook: {
      id: { type: String },
      name: { type: String },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
