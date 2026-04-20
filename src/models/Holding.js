const mongoose = require('mongoose');

const holdingSchema = new mongoose.Schema(
  {
    wallet_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    coin_id: { type: String, required: true },
    coin_symbol: { type: String, required: true },
    coin_name: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
    average_buy_price: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

holdingSchema.index({ wallet_id: 1, coin_id: 1 }, { unique: true });

module.exports = mongoose.model('Holding', holdingSchema);
