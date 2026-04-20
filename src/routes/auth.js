const express = require('express');
const router = express.Router();
const {
  register,
  login,
  refreshToken,
  getMe,
} = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.get('/me', auth, getMe);

module.exports = router;
