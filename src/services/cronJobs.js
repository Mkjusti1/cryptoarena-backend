const cron = require('node-cron');
const Holding = require('../models/Holding');
const PriceSnapshot = require('../models/PriceSnapshot');
const { getTopCoins } = require('./coinGecko');

const startCronJobs = () => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('⏰ Cron: saving price snapshots...');

      // Get all unique coin IDs currently held by anyone
      const holdings = await Holding.distinct('coin_id');

      if (holdings.length === 0) {
        console.log('⏰ Cron: no holdings found, skipping');
        return;
      }

      // Get live prices
      const coins = await getTopCoins();

      // Save a snapshot for each held coin
      const snapshots = holdings
        .map((coinId) => {
          const coin = coins.find((c) => c.id === coinId);
          if (!coin) return null;
          return {
            coin_id: coin.id,
            coin_symbol: coin.symbol.toUpperCase(),
            price_usd: coin.current_price,
            recorded_at: new Date(),
          };
        })
        .filter(Boolean);

      if (snapshots.length > 0) {
        await PriceSnapshot.insertMany(snapshots);
        console.log(`⏰ Cron: saved ${snapshots.length} price snapshots`);
      }
    } catch (err) {
      console.error('⏰ Cron error:', err.message);
    }
  });

  console.log('⏰ Cron jobs started');
};

module.exports = startCronJobs;
