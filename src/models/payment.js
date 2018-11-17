const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    stripeChargeId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    lastFour: { type: String },
    description: { type: String },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Payment', paymentSchema);
