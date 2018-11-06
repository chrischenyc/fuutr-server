const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true },
    password: { type: String },
    phone_number: { type: String },
    country_code: { type: Number },
    facebook_provider: {
      type: {
        id: String,
        token: String,
      },
      select: false,
    },
  },
  { timestamps: true }
);

userSchema.virtual('jwtToken').get(function generateJWTToken() {
  const { _id } = this;
  return { token: jwt.sign({ _id }, process.env.JWT_SECRET, { expiresIn: '1h' }) };
});

module.exports = mongoose.model('User', userSchema);
