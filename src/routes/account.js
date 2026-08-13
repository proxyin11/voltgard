const express = require('express');
const bcrypt = require('bcryptjs');
const { queryOne, queryAll, runStatement, getDatabase, saveDatabase } = require('../db');
const { deriveKey, encrypt, decrypt } = require('../crypto');
const { requireAuth } = require('../middleware/auth');
const { changePasswordValidation } = require('../middleware/validator');
const config = require('../config');
const logger = require('../logger');

const router = express.Router();

router.use(requireAuth);

// PUT /api/account/change-password
router.put('/change-password', changePasswordValidation, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.session.userId;

    const user = queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const oldVaultKey = deriveKey(currentPassword, user.salt);
    const newVaultKey = deriveKey(newPassword, user.salt);
    const newPasswordHash = await bcrypt.hash(newPassword, config.security.bcryptRounds);

    // Re-encrypt all credentials in a transaction
    const db = getDatabase();
    db.run('BEGIN TRANSACTION;');
    try {
      // Update user password hash
      db.run("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
        [newPasswordHash, userId]);

      // Get all credentials
      const credentials = queryAll(
        'SELECT id, encrypted_password, iv, auth_tag FROM credentials WHERE user_id = ?',
        [userId]
      );

      // Re-encrypt each credential
      for (const cred of credentials) {
        const plainPassword = decrypt(cred.encrypted_password, cred.iv, cred.auth_tag, oldVaultKey);
        const { encrypted, iv, authTag } = encrypt(plainPassword, newVaultKey);
        db.run("UPDATE credentials SET encrypted_password = ?, iv = ?, auth_tag = ?, updated_at = datetime('now') WHERE id = ?",
          [encrypted, iv, authTag, cred.id]);
      }

      db.run('COMMIT;');
      saveDatabase();

      // Update session with new vault key
      req.session.vaultKey = newVaultKey.toString('hex');

      logger.info('Master password changed', { userId, reEncryptedCount: credentials.length });
      res.json({
        message: 'Master password changed successfully.',
        credentialsUpdated: credentials.length,
      });
    } catch (err) {
      db.run('ROLLBACK;');
      throw err;
    }
  } catch (error) {
    logger.error('Change password error', { error: error.message });
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

// DELETE /api/account
router.delete('/', async (req, res) => {
  try {
    const userId = req.session.userId;
    const db = getDatabase();

    db.run('BEGIN TRANSACTION;');
    try {
      db.run('DELETE FROM credentials WHERE user_id = ?', [userId]);
      db.run('DELETE FROM categories WHERE user_id = ?', [userId]);
      db.run('DELETE FROM users WHERE id = ?', [userId]);
      db.run('COMMIT;');
      saveDatabase();
    } catch (err) {
      db.run('ROLLBACK;');
      throw err;
    }

    req.session.destroy((err) => {
      if (err) {
        logger.error('Error destroying session after account deletion', { error: err.message });
      }
    });

    logger.info('Account deleted', { userId });
    res.json({ message: 'Account and all data deleted successfully.' });
  } catch (error) {
    logger.error('Delete account error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete account.' });
  }
});

module.exports = router;
