const { getTopCoins, getCoinPrice } = require('../services/coinGecko');

// @route GET /api/market/prices
const getPrices = async (req, res) => {
  const coins = await getTopCoins();

  const formatted = coins.map((coin) => ({
    id: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    image: coin.image,
    current_price: coin.current_price,
    price_change_24h: coin.price_change_percentage_24h,
    market_cap: coin.market_cap,
  }));

  res.json({ coins: formatted });
};

// @route GET /api/market/coin/:coinId
const getCoin = async (req, res) => {
  const { coinId } = req.params;
  const coin = await getCoinPrice(coinId);

  res.json({
    id: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    image: coin.image,
    current_price: coin.current_price,
    price_change_24h: coin.price_change_percentage_24h,
    market_cap: coin.market_cap,
    total_volume: coin.total_volume,
  });
};

module.exports = { getPrices, getCoin };
