const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.SchemaTypes.ObjectId,
      required: true,
    },
    expired: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('RefreshToken', refreshTokenSchema, 'refresh_tokens');
