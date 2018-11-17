const mongoose = require('mongoose');

/**
 * Transaction happens when there is a change to user's account balance, e.g.:
 * 1. balance top up
 * 2. pay a ride
 * 3. redeem a coupon
 * 4. receive a credit
 *
 * A transaction doesn't necessary mean an actual credit card charge
 */
const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, select: false },
    amount: { type: Number, required: true },
    payment: { type: mongoose.Schema.Types.ObjectId, select: false }, // if it's a top up transaction
    ride: { type: mongoose.Schema.Types.ObjectId, select: false }, // if it's a ride transaction
    type: { type: String, required: true, default: 'ride' }, // top-up | ride | coupon | credit
    balance: { type: Number, required: true },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Transaction', transactionSchema);
