const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    isAdmin: { type: Boolean, default: false },
    isCouncil: { type: Boolean, default: false },
    email: {
      type: String,
      unique: true,
      sparse: true, // email may be null, need sparse indexing here
      trim: true,
    },
    password: { type: String, select: false },
    passwordResetTokens: {
      type: [
        {
          createdAt: { type: Date, required: true, default: Date.now },
          hashedToken: { type: String, required: true },
        },
      ],
      select: false,
    },
    phoneNumber: { type: String, trim: true },
    countryCode: { type: Number },
    facebookId: {
      type: String,
      unique: true,
      sparse: true, // facebookId may be null, need sparse indexing here
      select: false,
    },
    displayName: { type: String, trim: true },
    photo: { type: String },
    balance: { type: Number, require: true, default: 0 },
    stripeCustomerId: {
      type: String,
      unique: true,
      sparse: true, // stripeCustomerId may be null, need sparse indexing here
      select: false,
    },
    canReserveVehicleAfter: { type: Date, select: false }, // user needs to wait for 15 mins before next reserve
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('User', userSchema);
