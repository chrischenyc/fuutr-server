const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    isAdmin: { type: Boolean, default: false },
    email: { type: String, unique: true, trim: true },
    password: { type: String, select: false },
    passwordResetTokens: {
      type: [
        {
          createdAt: { type: Date, required: true, default: Date.now },
          hashedToken: { type: String, required: true },
        },
      ],
    },
    phoneNumber: { type: String, trim: true },
    countryCode: { type: Number },
    facebookId: { type: String, unique: true, select: false },
    displayName: { type: String, trim: true },
    photo: { type: String },
    balance: { type: Number, require: true, default: 0 },
    stripeCustomerId: { type: String, unique: true },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('User', userSchema);
