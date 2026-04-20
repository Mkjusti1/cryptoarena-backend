const express = require('express');
const router = express.Router();
const {
  initiateSubscription,
  paystackWebhook,
  getSubscriptionStatus,
} = require('../controllers/subscriptionsController');
const auth = require('../middleware/auth');

router.post('/initiate', auth, initiateSubscription);
router.post('/paystack-webhook', paystackWebhook);
router.get('/status', auth, getSubscriptionStatus);

module.exports = router;
