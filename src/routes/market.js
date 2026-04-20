const express = require('express');
const router = express.Router();
const { getPrices, getCoin } = require('../controllers/marketController');
const auth = require('../middleware/auth');

router.get('/prices', auth, getPrices);
router.get('/coin/:coinId', auth, getCoin);

module.exports = router;
