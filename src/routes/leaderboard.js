const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requirePro = require('../middleware/pro');
const Wallet = require('../models/Wallet');
const User = require('../models/User');

router.get('/', auth, requirePro, async (req, res) => {
  // Get all PRO wallets with their users
  const proWallets = await Wallet.find({
    wallet_type: 'PRO',
  }).populate('user_id', 'username account_tier');

  // Calculate portfolio value for each wallet
  const leaderboard = proWallets
    .filter((w) => w.user_id) // filter out deleted users
    .map((wallet) => ({
      username: wallet.user_id.username,
      cash_balance: wallet.cash_balance,
      portfolio_value: wallet.cash_balance, // Phase 5 will add holdings value
    }))
    .sort((a, b) => b.portfolio_value - a.portfolio_value)
    .slice(0, 10)
    .map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));

  res.json({ leaderboard });
});

module.exports = router;
