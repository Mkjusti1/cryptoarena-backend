const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Wallet = require('../models/Wallet');

// Generate tokens
const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  });
};

// @route POST /api/auth/register
const register = async (req, res) => {
  const { email, username, password } = req.body;

  // Validate input
  if (!email || !username || !password) {
    return res
      .status(400)
      .json({ error: 'Email, username and password are required' });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: 'Password must be at least 6 characters' });
  }

  // Check if user exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    const field = existingUser.email === email ? 'Email' : 'Username';
    return res.status(409).json({ error: `${field} already taken` });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  // Create user
  const user = await User.create({
    email,
    username,
    password_hash,
  });

  // Create demo wallet automatically with $10,000
  await Wallet.create({
    user_id: user._id,
    wallet_type: 'DEMO',
    cash_balance: 10000,
  });

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  res.status(201).json({
    message: 'Account created successfully',
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      email: user.email,
      username: user.username,
      account_tier: user.account_tier,
    },
  });
};

// @route POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Find user
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Check password
  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  res.json({
    message: 'Login successful',
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      email: user.email,
      username: user.username,
      account_tier: user.account_tier,
      subscription_expires_at: user.subscription_expires_at,
    },
  });
};

// @route POST /api/auth/refresh
const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  const user = await User.findById(decoded.userId).select('-password_hash');

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  const accessToken = generateAccessToken(user._id);

  res.json({ accessToken });
};

// @route GET /api/auth/me
const getMe = async (req, res) => {
  const user = req.user;

  const wallet = await Wallet.findOne({
    user_id: user._id,
    wallet_type: 'DEMO',
  });

  res.json({
    user: {
      id: user._id,
      email: user.email,
      username: user.username,
      account_tier: user.account_tier,
      subscription_expires_at: user.subscription_expires_at,
    },
    demo_wallet: {
      cash_balance: wallet?.cash_balance || 0,
    },
  });
};

module.exports = { register, login, refreshToken, getMe };
