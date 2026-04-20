const axios = require('axios');
const crypto = require('crypto');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Subscription = require('../models/Subscription');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const SUBSCRIPTION_AMOUNT_NGN = 200000; // ₦2,000 in kobo (Paystack uses kobo)
const PRO_WALLET_BALANCE = 50000; // $50,000 virtual USD

// @route POST /api/subscriptions/initiate
const initiateSubscription = async (req, res) => {
  const user = req.user;

  // Check if already has active Pro subscription
  const isProActive =
    user.account_tier === 'PRO' &&
    user.subscription_expires_at &&
    new Date(user.subscription_expires_at) > new Date();

  if (isProActive) {
    return res.status(400).json({
      error: 'You already have an active Pro subscription',
      expires_at: user.subscription_expires_at,
    });
  }

  // Initialize Paystack transaction
  const response = await axios.post(
    'https://api.paystack.co/transaction/initialize',
    {
      email: user.email,
      amount: SUBSCRIPTION_AMOUNT_NGN,
      currency: 'NGN',
      metadata: {
        user_id: user._id.toString(),
        plan: 'PRO',
        cancel_action: `${process.env.CLIENT_URL}/upgrade`,
      },
      callback_url: `${process.env.CLIENT_URL}/subscription/success`,
    },
    {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const { authorization_url, reference } = response.data.data;

  res.json({
    message: 'Payment initialized',
    payment_url: authorization_url,
    reference,
  });
};

// @route POST /api/subscriptions/paystack-webhook
const paystackWebhook = async (req, res) => {
  // Verify webhook signature
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(req.body)
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(req.body);

  // Only handle successful charges
  if (event.event !== 'charge.success') {
    return res.status(200).json({ received: true });
  }

  const { reference, amount, metadata } = event.data;
  const userId = metadata?.user_id;

  if (!userId) {
    return res.status(400).json({ error: 'Missing user_id in metadata' });
  }

  // Check if this reference was already processed
  const existingSubscription = await Subscription.findOne({
    paystack_reference: reference,
  });

  if (existingSubscription) {
    return res.status(200).json({ received: true });
  }

  // Set subscription dates
  const startedAt = new Date();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Create subscription record
  await Subscription.create({
    user_id: userId,
    amount_paid_ngn: amount / 100, // Convert kobo to naira
    paystack_reference: reference,
    status: 'ACTIVE',
    started_at: startedAt,
    expires_at: expiresAt,
  });

  // Upgrade user to Pro
  await User.findByIdAndUpdate(userId, {
    account_tier: 'PRO',
    subscription_expires_at: expiresAt,
  });

  // Create or reset Pro wallet
  const existingProWallet = await Wallet.findOne({
    user_id: userId,
    wallet_type: 'PRO',
  });

  if (existingProWallet) {
    // Renewing subscription — top up balance back to $50,000
    existingProWallet.cash_balance = PRO_WALLET_BALANCE;
    await existingProWallet.save();
  } else {
    // First time Pro — create new wallet
    await Wallet.create({
      user_id: userId,
      wallet_type: 'PRO',
      cash_balance: PRO_WALLET_BALANCE,
    });
  }

  console.log(`✅ Pro subscription activated for user ${userId}`);
  res.status(200).json({ received: true });
};

// @route GET /api/subscriptions/status
const getSubscriptionStatus = async (req, res) => {
  const user = req.user;

  const isProActive =
    user.account_tier === 'PRO' &&
    user.subscription_expires_at &&
    new Date(user.subscription_expires_at) > new Date();

  const subscriptions = await Subscription.find({
    user_id: user._id,
  })
    .sort({ createdAt: -1 })
    .limit(5);

  const daysRemaining = isProActive
    ? Math.ceil(
        (new Date(user.subscription_expires_at) - new Date()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  res.json({
    account_tier: user.account_tier,
    is_pro_active: isProActive,
    subscription_expires_at: user.subscription_expires_at,
    days_remaining: daysRemaining,
    subscription_history: subscriptions,
  });
};

module.exports = {
  initiateSubscription,
  paystackWebhook,
  getSubscriptionStatus,
};
