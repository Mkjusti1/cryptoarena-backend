const Wallet = require('../models/Wallet');
const Holding = require('../models/Holding');
const Trade = require('../models/Trade');
const { getCoinPrice } = require('../services/coinGecko');

// @route POST /api/trades/buy
const buyCoin = async (req, res) => {
  const { coin_id, quantity, wallet_type = 'DEMO' } = req.body;

  // Validate input
  if (!coin_id || !quantity || quantity <= 0) {
    return res
      .status(400)
      .json({ error: 'Valid coin_id and quantity are required' });
  }

  // Validate wallet type
  if (!['DEMO', 'PRO'].includes(wallet_type)) {
    return res.status(400).json({ error: 'wallet_type must be DEMO or PRO' });
  }

  // If PRO wallet requested, check subscription
  if (wallet_type === 'PRO') {
    const user = req.user;
    const isProActive =
      user.account_tier === 'PRO' &&
      user.subscription_expires_at &&
      new Date(user.subscription_expires_at) > new Date();

    if (!isProActive) {
      return res.status(403).json({ error: 'Pro subscription required' });
    }
  }

  // Get live price
  const coin = await getCoinPrice(coin_id);
  const price = coin.current_price;
  const totalCost = price * quantity;

  // Get wallet
  const wallet = await Wallet.findOne({
    user_id: req.user._id,
    wallet_type,
  });

  if (!wallet) {
    return res.status(404).json({ error: 'Wallet not found' });
  }

  // Check sufficient funds
  if (wallet.cash_balance < totalCost) {
    return res.status(400).json({
      error: 'Insufficient funds',
      required: totalCost,
      available: wallet.cash_balance,
    });
  }

  // Check if holding already exists
  const existingHolding = await Holding.findOne({
    wallet_id: wallet._id,
    coin_id,
  });

  if (existingHolding) {
    // Update average buy price
    const totalQuantity = existingHolding.quantity + quantity;
    const newAvgPrice =
      (existingHolding.average_buy_price * existingHolding.quantity +
        price * quantity) /
      totalQuantity;

    existingHolding.quantity = totalQuantity;
    existingHolding.average_buy_price = newAvgPrice;
    await existingHolding.save();
  } else {
    // Create new holding
    await Holding.create({
      wallet_id: wallet._id,
      coin_id,
      coin_symbol: coin.symbol.toUpperCase(),
      coin_name: coin.name,
      quantity,
      average_buy_price: price,
    });
  }

  // Deduct from wallet balance
  wallet.cash_balance -= totalCost;
  await wallet.save();

  // Record trade
  const trade = await Trade.create({
    wallet_id: wallet._id,
    coin_id,
    coin_symbol: coin.symbol.toUpperCase(),
    coin_name: coin.name,
    trade_type: 'BUY',
    quantity,
    price_at_trade: price,
    total_value: totalCost,
  });

  res.status(201).json({
    message: `Successfully bought ${quantity} ${coin.symbol.toUpperCase()}`,
    trade: {
      coin: coin.name,
      quantity,
      price_at_trade: price,
      total_cost: totalCost,
      remaining_balance: wallet.cash_balance,
    },
  });
};

// @route POST /api/trades/sell
const sellCoin = async (req, res) => {
  const { coin_id, quantity, wallet_type = 'DEMO' } = req.body;

  // Validate input
  if (!coin_id || !quantity || quantity <= 0) {
    return res
      .status(400)
      .json({ error: 'Valid coin_id and quantity are required' });
  }

  // Get live price
  const coin = await getCoinPrice(coin_id);
  const price = coin.current_price;
  const totalProceeds = price * quantity;

  // Get wallet
  const wallet = await Wallet.findOne({
    user_id: req.user._id,
    wallet_type,
  });

  if (!wallet) {
    return res.status(404).json({ error: 'Wallet not found' });
  }

  // Check holding exists
  const holding = await Holding.findOne({
    wallet_id: wallet._id,
    coin_id,
  });

  if (!holding) {
    return res.status(400).json({ error: `You don't own any ${coin.name}` });
  }

  // Check sufficient quantity
  if (holding.quantity < quantity) {
    return res.status(400).json({
      error: 'Insufficient holdings',
      requested: quantity,
      available: holding.quantity,
    });
  }

  // Update or delete holding
  if (holding.quantity === quantity) {
    // Selling entire holding — delete the row
    await Holding.deleteOne({ _id: holding._id });
  } else {
    // Partial sell — reduce quantity
    holding.quantity -= quantity;
    await holding.save();
  }

  // Add proceeds to wallet
  wallet.cash_balance += totalProceeds;
  await wallet.save();

  // Record trade
  await Trade.create({
    wallet_id: wallet._id,
    coin_id,
    coin_symbol: coin.symbol.toUpperCase(),
    coin_name: coin.name,
    trade_type: 'SELL',
    quantity,
    price_at_trade: price,
    total_value: totalProceeds,
  });

  // Calculate P&L
  const pnl = (price - holding.average_buy_price) * quantity;

  res.json({
    message: `Successfully sold ${quantity} ${coin.symbol.toUpperCase()}`,
    trade: {
      coin: coin.name,
      quantity,
      price_at_trade: price,
      total_proceeds: totalProceeds,
      pnl: pnl,
      new_balance: wallet.cash_balance,
    },
  });
};

// @route GET /api/trades/history/:walletType
const getTradeHistory = async (req, res) => {
  const { walletType } = req.params;

  const wallet = await Wallet.findOne({
    user_id: req.user._id,
    wallet_type: walletType.toUpperCase(),
  });

  if (!wallet) {
    return res.status(404).json({ error: 'Wallet not found' });
  }

  const trades = await Trade.find({ wallet_id: wallet._id })
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({ trades });
};

module.exports = { buyCoin, sellCoin, getTradeHistory };
