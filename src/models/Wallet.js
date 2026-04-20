const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    wallet_type: {
      type: String,
      enum: ['DEMO', 'PRO'],
      required: true,
    },
    cash_balance: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// One demo and one pro wallet per user
walletSchema.index({ user_id: 1, wallet_type: 1 }, { unique: true });

module.exports = mongoose.model('Wallet', walletSchema);
