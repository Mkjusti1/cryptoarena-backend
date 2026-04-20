const mongoose = require('mongoose');

const priceSnapshotSchema = new mongoose.Schema({
  coin_id: { type: String, required: true },
  coin_symbol: { type: String, required: true },
  price_usd: { type: Number, required: true },
  recorded_at: { type: Date, default: Date.now },
});

priceSnapshotSchema.index({ coin_id: 1 });
priceSnapshotSchema.index({ recorded_at: -1 });

module.exports = mongoose.model('PriceSnapshot', priceSnapshotSchema);
