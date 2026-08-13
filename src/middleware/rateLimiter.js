const rateLimit = require('express-rate-limit');
const config = require('../config');
const logger = require('../logger');

/**
 * Rate limiter for login endpoint.
 * Limits to configured max attempts per window.
 */
const loginLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMaxAttempts,
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded on login', { ip: req.ip });
    res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
  },
  skip: () => config.isTest(), // Skip rate limiting in tests
});

module.exports = { loginLimiter };
