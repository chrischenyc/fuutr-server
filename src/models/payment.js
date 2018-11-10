const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    stripeChargeId: { type: String, required: true },
    amount: { type: Number, required: true },
    userId: { type: String, required: true },
    lastFour: { type: String },
    description: { type: String },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Payment', paymentSchema);
