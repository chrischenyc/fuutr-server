const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

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

userSchema.virtual('jwtToken').get(function generateJWTToken() {
  const { _id } = this;
  return { token: jwt.sign({ _id }, process.env.JWT_SECRET, { expiresIn: '1h' }) };
});

module.exports = mongoose.model('User', userSchema);
