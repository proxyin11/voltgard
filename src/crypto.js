const crypto = require('crypto');
const config = require('./config');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Generate a random salt for key derivation.
 * @returns {string} Hex-encoded salt
 */
function generateSalt() {
  return crypto.randomBytes(SALT_LENGTH).toString('hex');
}

/**
 * Derive a 256-bit encryption key from master password + salt using PBKDF2.
 * @param {string} masterPassword - The user's master password
 * @param {string} salt - Hex-encoded salt
 * @returns {Buffer} 32-byte key
 */
function deriveKey(masterPassword, salt) {
  const iterations = config.security.pbkdf2Iterations;
  return crypto.pbkdf2Sync(
    masterPassword,
    Buffer.from(salt, 'hex'),
    iterations,
    KEY_LENGTH,
    'sha512'
  );
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * @param {string} plaintext - The text to encrypt
 * @param {Buffer} key - 32-byte encryption key
 * @returns {{ encrypted: string, iv: string, authTag: string }} Hex-encoded values
 */
function encrypt(plaintext, key) {
  if (!plaintext && plaintext !== '') {
    throw new Error('Plaintext is required for encryption');
  }
  if (!key || key.length !== KEY_LENGTH) {
    throw new Error('Invalid encryption key');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
}

/**
 * Decrypt ciphertext using AES-256-GCM.
 * @param {string} encryptedHex - Hex-encoded ciphertext
 * @param {string} ivHex - Hex-encoded IV
 * @param {string} authTagHex - Hex-encoded auth tag
 * @param {Buffer} key - 32-byte encryption key
 * @returns {string} Decrypted plaintext
 */
function decrypt(encryptedHex, ivHex, authTagHex, key) {
  if (encryptedHex == null || ivHex == null || authTagHex == null) {
    throw new Error('Encrypted data, IV, and auth tag are all required for decryption');
  }
  if (!key || key.length !== KEY_LENGTH) {
    throw new Error('Invalid encryption key');
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivHex, 'hex'),
    { authTagLength: AUTH_TAG_LENGTH }
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

module.exports = {
  generateSalt,
  deriveKey,
  encrypt,
  decrypt,
  ALGORITHM,
  KEY_LENGTH,
  IV_LENGTH,
  SALT_LENGTH,
};
