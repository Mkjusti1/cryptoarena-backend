const express = require('express');
const router = express.Router();
const {
  getPortfolio,
  getPortfolioHistory,
} = require('../controllers/portfolioController');
const auth = require('../middleware/auth');

router.get('/:walletType', auth, getPortfolio);
router.get('/:walletType/history', auth, getPortfolioHistory);

module.exports = router;
