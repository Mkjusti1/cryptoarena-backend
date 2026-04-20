const Wallet = require('../models/Wallet');
const Holding = require('../models/Holding');
const Trade = require('../models/Trade');
const PriceSnapshot = require('../models/PriceSnapshot');
const { getCoinPrice, getTopCoins } = require('../services/coinGecko');

// @route GET /api/portfolio/:walletType
const getPortfolio = async (req, res) => {
  const { walletType } = req.params;
  const type = walletType.toUpperCase();

  // If PRO wallet requested, check subscription
  if (type === 'PRO') {
    const user = req.user;
    const isProActive =
      user.account_tier === 'PRO' &&
      user.subscription_expires_at &&
      new Date(user.subscription_expires_at) > new Date();

    if (!isProActive) {
      return res.status(403).json({ error: 'Pro subscription required' });
    }
  }

  // Get wallet
  const wallet = await Wallet.findOne({
    user_id: req.user._id,
    wallet_type: type,
  });

  if (!wallet) {
    return res.status(404).json({ error: 'Wallet not found' });
  }

  // Get holdings
  const holdings = await Holding.find({ wallet_id: wallet._id });

  // Get live prices for all held coins
  const coins = await getTopCoins();

  // Calculate holdings value with live prices
  let totalHoldingsValue = 0;
  const enrichedHoldings = holdings.map((holding) => {
    const liveCoin = coins.find((c) => c.id === holding.coin_id);
    const currentPrice = liveCoin?.current_price || 0;
    const currentValue = currentPrice * holding.quantity;
    const costBasis = holding.average_buy_price * holding.quantity;
    const unrealizedPnl = currentValue - costBasis;
    const unrealizedPnlPercent =
      costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;

    totalHoldingsValue += currentValue;

    return {
      coin_id: holding.coin_id,
      coin_symbol: holding.coin_symbol,
      coin_name: holding.coin_name,
      quantity: holding.quantity,
      average_buy_price: holding.average_buy_price,
      current_price: currentPrice,
      current_value: currentValue,
      unrealized_pnl: unrealizedPnl,
      unrealized_pnl_percent: unrealizedPnlPercent.toFixed(2),
    };
  });

  // Total portfolio value
  const totalPortfolioValue = wallet.cash_balance + totalHoldingsValue;

  // Starting balance
  const startingBalance = type === 'DEMO' ? 10000 : 50000;

  // Overall P&L
  const totalPnl = totalPortfolioValue - startingBalance;
  const totalPnlPercent = ((totalPnl / startingBalance) * 100).toFixed(2);

  res.json({
    wallet_type: type,
    cash_balance: wallet.cash_balance,
    holdings_value: totalHoldingsValue,
    total_portfolio_value: totalPortfolioValue,
    total_pnl: totalPnl,
    total_pnl_percent: totalPnlPercent,
    holdings: enrichedHoldings,
  });
};

// @route GET /api/portfolio/:walletType/history
const getPortfolioHistory = async (req, res) => {
  const { walletType } = req.params;
  const type = walletType.toUpperCase();

  const wallet = await Wallet.findOne({
    user_id: req.user._id,
    wallet_type: type,
  });

  if (!wallet) {
    return res.status(404).json({ error: 'Wallet not found' });
  }

  // Get price snapshots for coins in this wallet
  const holdings = await Holding.find({ wallet_id: wallet._id });
  const coinIds = holdings.map((h) => h.coin_id);

  // Get last 7 days of snapshots
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const snapshots = await PriceSnapshot.find({
    coin_id: { $in: coinIds },
    recorded_at: { $gte: sevenDaysAgo },
  }).sort({ recorded_at: 1 });

  // Group snapshots by date
  const groupedByDate = {};
  snapshots.forEach((snapshot) => {
    const date = snapshot.recorded_at.toISOString().split('T')[0];
    if (!groupedByDate[date]) {
      groupedByDate[date] = [];
    }
    groupedByDate[date].push(snapshot);
  });

  // Calculate portfolio value per date
  const history = Object.entries(groupedByDate).map(([date, snaps]) => {
    let holdingsValue = 0;
    holdings.forEach((holding) => {
      const snap = snaps.find((s) => s.coin_id === holding.coin_id);
      if (snap) {
        holdingsValue += snap.price_usd * holding.quantity;
      }
    });
    return {
      date,
      portfolio_value: wallet.cash_balance + holdingsValue,
    };
  });

  res.json({ history });
};

module.exports = { getPortfolio, getPortfolioHistory };
