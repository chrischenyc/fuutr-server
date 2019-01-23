const mongoose = require('mongoose');

/**
 * Payment happens when user actually pays,
 * either to top up the balance or to subscribe to a monthly plan.
 * User doesn't pay per ride, as the cost is taken from the account balance, or free because of
 * the monthly plan user has subscribed.
 */

const paymentSchema = new mongoose.Schema(
  {
    stripeChargeId: { type: String, required: true },
    amount: { type: Number, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    lastFour: { type: String },
    description: { type: String },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Payment', paymentSchema);
