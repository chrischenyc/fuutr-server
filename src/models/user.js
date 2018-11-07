const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, trim: true },
    password: { type: String },
    phone_number: { type: String, trim: true },
    country_code: { type: Number },
    facebookId: { type: String },
    displayName: { type: String, trim: true },
    photo: { type: String },
  },
  { timestamps: true }
);

userSchema.virtual('jwtToken').get(function generateJWTToken() {
  const { _id } = this;
  return { token: jwt.sign({ _id }, process.env.JWT_SECRET, { expiresIn: '1h' }) };
});

module.exports = mongoose.model('User', userSchema);
