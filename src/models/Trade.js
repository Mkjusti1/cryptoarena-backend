const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema(
  {
    wallet_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    coin_id: { type: String, required: true },
    coin_symbol: { type: String, required: true },
    coin_name: { type: String, required: true },
    trade_type: {
      type: String,
      enum: ['BUY', 'SELL'],
      required: true,
    },
    quantity: { type: Number, required: true },
    price_at_trade: { type: Number, required: true },
    total_value: { type: Number, required: true },
  },
  { timestamps: true }
);

tradeSchema.index({ wallet_id: 1 });

module.exports = mongoose.model('Trade', tradeSchema);
