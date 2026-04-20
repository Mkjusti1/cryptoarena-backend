const https = require('https');

// In-memory cache
const cache = {
  prices: null,
  lastFetched: null,
  TTL: 60 * 1000, // 60 seconds
};

const fetchFromCoinGecko = (url) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.coingecko.com',
      path: url,
      method: 'GET',
      headers: {
        'User-Agent': 'CryptoArena/1.0',
        Accept: 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error('Failed to parse CoinGecko response'));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('CoinGecko request timed out'));
    });
    req.end();
  });
};

// Get top 50 coins with prices
const getTopCoins = async () => {
  const now = Date.now();

  // Return cached data if still fresh
  if (
    cache.prices &&
    cache.lastFetched &&
    now - cache.lastFetched < cache.TTL
  ) {
    console.log('📦 Returning cached prices');
    return cache.prices;
  }

  try {
    console.log('🌐 Fetching fresh prices from CoinGecko');
    const data = await fetchFromCoinGecko(
      '/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h'
    );

    // Update cache
    cache.prices = data;
    cache.lastFetched = now;

    return data;
  } catch (err) {
    // If CoinGecko is down, return stale cache if available
    if (cache.prices) {
      console.log('⚠️ CoinGecko unavailable, returning stale cache');
      return cache.prices;
    }
    throw new Error('Price data unavailable. Please try again later.');
  }
};

// Get single coin price by id
const getCoinPrice = async (coinId) => {
  const coins = await getTopCoins();
  const coin = coins.find((c) => c.id === coinId);

  if (!coin) {
    throw new Error(`Coin ${coinId} not found`);
  }

  return coin;
};

module.exports = { getTopCoins, getCoinPrice };
