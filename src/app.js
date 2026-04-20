require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const portfolioRoutes = require('./routes/portfolio');
const tradesRoutes = require('./routes/trades');
const marketRoutes = require('./routes/market');
const subscriptionsRoutes = require('./routes/subscriptions');
const leaderboardRoutes = require('./routes/leaderboard');
const analyticsRoutes = require('./routes/analytics');

const app = express();

// Security & Parsing
app.use(helmet());
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  })
);
app.use(morgan('dev'));

// Raw body for Paystack webhook verification
app.use(
  '/api/subscriptions/paystack-webhook',
  express.raw({ type: 'application/json' })
);
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'CryptoArena API is running',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/trades', tradesRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
