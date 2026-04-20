const requirePro = (req, res, next) => {
  const user = req.user;

  const isProActive =
    user.account_tier === 'PRO' &&
    user.subscription_expires_at &&
    new Date(user.subscription_expires_at) > new Date();

  if (!isProActive) {
    return res.status(403).json({
      error: 'Pro subscription required',
      upgrade_url: '/upgrade',
    });
  }

  next();
};

module.exports = requirePro;
