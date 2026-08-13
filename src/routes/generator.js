const express = require('express');
const crypto = require('crypto');
const { generatorValidation } = require('../middleware/validator');
const logger = require('../logger');

const router = express.Router();

const CHAR_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

// POST /api/generate-password
router.post('/', generatorValidation, (req, res) => {
  try {
    const {
      length = 16,
      uppercase = true,
      lowercase = true,
      digits = true,
      symbols = true,
    } = req.body;

    // Build character pool
    let pool = '';
    if (uppercase) pool += CHAR_SETS.uppercase;
    if (lowercase) pool += CHAR_SETS.lowercase;
    if (digits) pool += CHAR_SETS.digits;
    if (symbols) pool += CHAR_SETS.symbols;

    if (pool.length === 0) {
      return res.status(400).json({ error: 'At least one character set must be enabled.' });
    }

    // Generate password using crypto.randomInt for uniform distribution
    let password = '';
    const requiredChars = [];

    // Ensure at least one character from each selected set
    if (uppercase) requiredChars.push(CHAR_SETS.uppercase[crypto.randomInt(CHAR_SETS.uppercase.length)]);
    if (lowercase) requiredChars.push(CHAR_SETS.lowercase[crypto.randomInt(CHAR_SETS.lowercase.length)]);
    if (digits) requiredChars.push(CHAR_SETS.digits[crypto.randomInt(CHAR_SETS.digits.length)]);
    if (symbols) requiredChars.push(CHAR_SETS.symbols[crypto.randomInt(CHAR_SETS.symbols.length)]);

    // Fill remaining length from full pool
    const remaining = length - requiredChars.length;
    for (let i = 0; i < remaining; i++) {
      password += pool[crypto.randomInt(pool.length)];
    }

    // Insert required chars at random positions
    let chars = password.split('');
    for (const rc of requiredChars) {
      const pos = crypto.randomInt(chars.length + 1);
      chars.splice(pos, 0, rc);
    }
    password = chars.join('');

    // Calculate strength
    const strength = calculateStrength(password, pool.length);

    res.json({ password, strength, length: password.length });
  } catch (error) {
    logger.error('Password generation error', { error: error.message });
    res.status(500).json({ error: 'Password generation failed.' });
  }
});

/**
 * Calculate password strength (0-100 score + label).
 */
function calculateStrength(password, poolSize) {
  const len = password.length;
  
  // Entropy-based calculation
  const entropy = len * Math.log2(poolSize || 2);
  
  let score = 0;
  if (entropy >= 128) score = 100;
  else if (entropy >= 80) score = 80;
  else if (entropy >= 60) score = 60;
  else if (entropy >= 40) score = 40;
  else if (entropy >= 28) score = 20;
  else score = 10;

  // Bonus for length
  if (len >= 20) score = Math.min(100, score + 10);

  let label;
  if (score >= 80) label = 'Very Strong';
  else if (score >= 60) label = 'Strong';
  else if (score >= 40) label = 'Moderate';
  else if (score >= 20) label = 'Weak';
  else label = 'Very Weak';

  return { score, label, entropy: Math.round(entropy) };
}

module.exports = router;
module.exports.calculateStrength = calculateStrength;
