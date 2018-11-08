const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, trim: true },
    password: { type: String, select: false },
    phoneNumber: { type: String, trim: true },
    countryCode: { type: Number },
    facebookId: { type: String, select: false },
    displayName: { type: String, trim: true },
    photo: { type: String },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('User', userSchema);
