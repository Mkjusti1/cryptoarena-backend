const express = require('express');
const router = express.Router();
const {
  buyCoin,
  sellCoin,
  getTradeHistory,
} = require('../controllers/tradesController');
const auth = require('../middleware/auth');

router.post('/buy', auth, buyCoin);
router.post('/sell', auth, sellCoin);
router.get('/history/:walletType', auth, getTradeHistory);

module.exports = router;
