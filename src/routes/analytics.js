const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requirePro = require('../middleware/pro');
const Trade = require('../models/Trade');
const Wallet = require('../models/Wallet');

router.get('/performance', auth, requirePro, async (req, res) => {
  const wallet = await Wallet.findOne({
    user_id: req.user._id,
    wallet_type: 'PRO',
  });

  if (!wallet) {
    return res.status(404).json({ error: 'Pro wallet not found' });
  }

  const trades = await Trade.find({ wallet_id: wallet._id });

  const totalTrades = trades.length;
  const buyTrades = trades.filter((t) => t.trade_type === 'BUY');
  const sellTrades = trades.filter((t) => t.trade_type === 'SELL');

  const totalInvested = buyTrades.reduce((sum, t) => sum + t.total_value, 0);
  const totalReturned = sellTrades.reduce((sum, t) => sum + t.total_value, 0);

  res.json({
    total_trades: totalTrades,
    buy_trades: buyTrades.length,
    sell_trades: sellTrades.length,
    total_invested: totalInvested,
    total_returned: totalReturned,
    current_cash_balance: wallet.cash_balance,
  });
});

router.get('/best-trades', auth, requirePro, async (req, res) => {
  const wallet = await Wallet.findOne({
    user_id: req.user._id,
    wallet_type: 'PRO',
  });

  if (!wallet) {
    return res.status(404).json({ error: 'Pro wallet not found' });
  }

  const bestTrades = await Trade.find({
    wallet_id: wallet._id,
    trade_type: 'SELL',
  })
    .sort({ total_value: -1 })
    .limit(5);

  res.json({ best_trades: bestTrades });
});

router.get('/worst-trades', auth, requirePro, async (req, res) => {
  const wallet = await Wallet.findOne({
    user_id: req.user._id,
    wallet_type: 'PRO',
  });

  if (!wallet) {
    return res.status(404).json({ error: 'Pro wallet not found' });
  }

  const worstTrades = await Trade.find({
    wallet_id: wallet._id,
    trade_type: 'SELL',
  })
    .sort({ total_value: 1 })
    .limit(5);

  res.json({ worst_trades: worstTrades });
});

module.exports = router;
