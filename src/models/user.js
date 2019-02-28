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
    emailUpdateToken: {
      type: String,
      select: false,
    },
    password: { type: String, select: false },
    passwordResetToken: {
      type: String,
      select: false,
    },
    phoneNumber: { type: String, trim: true },
    countryCode: { type: Number },
    facebookId: {
      type: String,
      unique: true,
      sparse: true, // facebookId may be null, need sparse indexing here
    },
    displayName: { type: String, trim: true },
    photo: { type: String },
    balance: { type: Number, require: true, default: 0 },
    stripeCustomerId: {
      type: String,
      unique: true,
      sparse: true, // stripeCustomerId may be null, need sparse indexing here
    },
    canReserveVehicleAfter: { type: Date }, // user needs to wait for 15 mins before next reserve
    oneSignalPlayerId: { type: String }, // OneSignal as push notification service
    applePushDeviceToken: { type: String }, // opted-in iOS devices
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('User', userSchema);
