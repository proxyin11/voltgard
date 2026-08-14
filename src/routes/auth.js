const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { queryOne, runStatement } = require('../db');
const { generateSalt, deriveKey } = require('../crypto');
const { loginValidation, registerValidation } = require('../middleware/validator');
const { loginLimiter } = require('../middleware/rateLimiter');
const config = require('../config');
const logger = require('../logger');

const router = express.Router();

// POST /api/auth/register
router.post('/register', registerValidation, async (req, res) => {
  try {
    const { email, masterPassword } = req.body;

    // Check if user already exists
    const existing = queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Generate user ID, salt, and hash password
    const userId = uuidv4();
    const salt = generateSalt();
    const passwordHash = await bcrypt.hash(masterPassword, config.security.bcryptRounds);

    // Insert user
    runStatement(
      'INSERT INTO users (id, email, password_hash, salt) VALUES (?, ?, ?, ?)',
      [userId, email, passwordHash, salt]
    );

    logger.info('User registered', { userId, email });

    res.status(201).json({ message: 'Registration successful. Please log in.' });
  } catch (error) {
    logger.error('Registration error', { error: error.message });
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, loginValidation, async (req, res) => {
  try {
    const { email, masterPassword } = req.body;

    // Find user
    const user = queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Verify password
    const isValid = await bcrypt.compare(masterPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Derive vault key from master password + user salt
    const vaultKey = deriveKey(masterPassword, user.salt);

    // Store in session (vault key is Buffer, store as hex)
    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.vaultKey = vaultKey.toString('hex');
    req.session.lastActivity = Date.now();

    logger.info('User logged in', { userId: user.id });

    res.json({ message: 'Login successful.', email: user.email });
  } catch (error) {
    logger.error('Login error', { error: error.message });
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const userId = req.session?.userId;
  req.session.destroy((err) => {
    if (err) {
      logger.error('Logout error', { error: err.message });
      return res.status(500).json({ error: 'Logout failed.' });
    }
    res.clearCookie('connect.sid');
    logger.info('User logged out', { userId });
    res.json({ message: 'Logged out successfully.' });
  });
});

// POST /api/auth/sso/google
router.post('/sso/google', async (req, res) => {
  try {
    let { email } = req.body;
    if (!email) {
      email = "google.user@example.com";
    }

    // Find or create user
    let user = queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      const userId = uuidv4();
      const salt = generateSalt();
      const randomPass = uuidv4() + uuidv4();
      const passwordHash = await bcrypt.hash(randomPass, config.security.bcryptRounds);

      runStatement(
        'INSERT INTO users (id, email, password_hash, salt) VALUES (?, ?, ?, ?)',
        [userId, email, passwordHash, salt]
      );
      user = queryOne('SELECT * FROM users WHERE id = ?', [userId]);
      logger.info('New Google SSO user created', { userId, email });
    }

    const ssoMasterKey = `SSO_GOOGLE_${user.id}_SECRET`;
    const vaultKey = deriveKey(ssoMasterKey, user.salt);

    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.vaultKey = vaultKey.toString('hex');
    req.session.lastActivity = Date.now();

    logger.info('Google SSO login successful', { userId: user.id });
    res.json({ message: 'Google SSO authentication successful.', email: user.email });
  } catch (error) {
    logger.error('Google SSO error', { error: error.message });
    res.status(500).json({ error: 'Google SSO authentication failed.' });
  }
});

// POST /api/auth/sso/apple
router.post('/sso/apple', async (req, res) => {
  try {
    let { email } = req.body;
    if (!email) {
      email = "apple.user@privaterelay.appleid.com";
    }

    // Find or create user
    let user = queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      const userId = uuidv4();
      const salt = generateSalt();
      const randomPass = uuidv4() + uuidv4();
      const passwordHash = await bcrypt.hash(randomPass, config.security.bcryptRounds);

      runStatement(
        'INSERT INTO users (id, email, password_hash, salt) VALUES (?, ?, ?, ?)',
        [userId, email, passwordHash, salt]
      );
      user = queryOne('SELECT * FROM users WHERE id = ?', [userId]);
      logger.info('New Apple SSO user created', { userId, email });
    }

    const ssoMasterKey = `SSO_APPLE_${user.id}_SECRET`;
    const vaultKey = deriveKey(ssoMasterKey, user.salt);

    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.vaultKey = vaultKey.toString('hex');
    req.session.lastActivity = Date.now();

    logger.info('Apple SSO login successful', { userId: user.id });
    res.json({ message: 'Apple SSO authentication successful.', email: user.email });
  } catch (error) {
    logger.error('Apple SSO error', { error: error.message });
    res.status(500).json({ error: 'Apple SSO authentication failed.' });
  }
});

// GET /api/auth/status
router.get('/status', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({
      authenticated: true,
      email: req.session.email,
      sessionTimeout: config.session.timeoutMinutes,
    });
  } else {
    res.json({ authenticated: false });
  }
});

module.exports = router;
