const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { queryAll, queryOne, runStatement } = require('../db');
const { encrypt, decrypt } = require('../crypto');
const { requireAuth } = require('../middleware/auth');
const {
  credentialValidation,
  credentialUpdateValidation,
  searchValidation,
  idParamValidation,
} = require('../middleware/validator');
const logger = require('../logger');

const router = express.Router();

// All credential routes require authentication
router.use(requireAuth);

function getVaultKey(req) {
  return Buffer.from(req.session.vaultKey, 'hex');
}

// POST /api/credentials - Create credential
router.post('/', credentialValidation, (req, res) => {
  try {
    const { siteName, url, username, password, notes, categoryId } = req.body;
    const userId = req.session.userId;
    const vaultKey = getVaultKey(req);

    // Duplicate detection
    if (url && username) {
      const duplicate = queryOne(
        'SELECT id FROM credentials WHERE user_id = ? AND url = ? AND username = ?',
        [userId, url, username]
      );
      if (duplicate) {
        return res.status(409).json({
          error: 'A credential with this URL and username already exists.',
          duplicateId: duplicate.id,
        });
      }
    }

    // Validate category belongs to user if provided
    if (categoryId) {
      const cat = queryOne(
        'SELECT id FROM categories WHERE id = ? AND user_id = ?',
        [categoryId, userId]
      );
      if (!cat) {
        return res.status(400).json({ error: 'Invalid category.' });
      }
    }

    // Encrypt password
    const { encrypted, iv, authTag } = encrypt(password, vaultKey);

    const id = uuidv4();
    runStatement(
      `INSERT INTO credentials (id, user_id, category_id, site_name, url, username, encrypted_password, iv, auth_tag, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, categoryId || null, siteName, url || '', username || '', encrypted, iv, authTag, notes || '']
    );

    logger.info('Credential created', { userId, credentialId: id, siteName });

    res.status(201).json({
      id,
      siteName,
      url: url || '',
      username: username || '',
      notes: notes || '',
      categoryId: categoryId || null,
      message: 'Credential saved successfully.',
    });
  } catch (error) {
    logger.error('Create credential error', { error: error.message });
    res.status(500).json({ error: 'Failed to save credential.' });
  }
});

// GET /api/credentials - List all credentials
router.get('/', (req, res) => {
  try {
    const userId = req.session.userId;
    const vaultKey = getVaultKey(req);

    const rows = queryAll(
      `SELECT c.*, cat.name as category_name
       FROM credentials c
       LEFT JOIN categories cat ON c.category_id = cat.id
       WHERE c.user_id = ?
       ORDER BY c.site_name ASC`,
      [userId]
    );

    const credentials = rows.map(row => ({
      id: row.id,
      siteName: row.site_name,
      url: row.url,
      username: row.username,
      password: decrypt(row.encrypted_password, row.iv, row.auth_tag, vaultKey),
      notes: row.notes,
      categoryId: row.category_id,
      categoryName: row.category_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json(credentials);
  } catch (error) {
    logger.error('List credentials error', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve credentials.' });
  }
});

// GET /api/credentials/search?q=
router.get('/search', searchValidation, (req, res) => {
  try {
    const userId = req.session.userId;
    const vaultKey = getVaultKey(req);
    const q = req.query.q || '';

    const searchTerm = `%${q}%`;
    const rows = queryAll(
      `SELECT c.*, cat.name as category_name
       FROM credentials c
       LEFT JOIN categories cat ON c.category_id = cat.id
       WHERE c.user_id = ? AND (c.site_name LIKE ? OR c.username LIKE ? OR c.url LIKE ?)
       ORDER BY c.site_name ASC`,
      [userId, searchTerm, searchTerm, searchTerm]
    );

    const credentials = rows.map(row => ({
      id: row.id,
      siteName: row.site_name,
      url: row.url,
      username: row.username,
      password: decrypt(row.encrypted_password, row.iv, row.auth_tag, vaultKey),
      notes: row.notes,
      categoryId: row.category_id,
      categoryName: row.category_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json(credentials);
  } catch (error) {
    logger.error('Search credentials error', { error: error.message });
    res.status(500).json({ error: 'Search failed.' });
  }
});

// GET /api/credentials/export - CSV export
router.get('/export', (req, res) => {
  try {
    const userId = req.session.userId;
    const vaultKey = getVaultKey(req);

    const rows = queryAll(
      `SELECT c.*, cat.name as category_name
       FROM credentials c
       LEFT JOIN categories cat ON c.category_id = cat.id
       WHERE c.user_id = ?
       ORDER BY c.site_name ASC`,
      [userId]
    );

    const csvHeader = 'site_name,url,username,password,notes,category\n';
    const csvRows = rows.map(row => {
      const password = decrypt(row.encrypted_password, row.iv, row.auth_tag, vaultKey);
      const escapeCsv = (val) => `"${(val || '').replace(/"/g, '""')}"`;
      return [
        escapeCsv(row.site_name),
        escapeCsv(row.url),
        escapeCsv(row.username),
        escapeCsv(password),
        escapeCsv(row.notes),
        escapeCsv(row.category_name || ''),
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvRows;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="vaultguard_export.csv"');
    res.send(csv);

    logger.info('Credentials exported', { userId, count: rows.length });
  } catch (error) {
    logger.error('Export error', { error: error.message });
    res.status(500).json({ error: 'Export failed.' });
  }
});

// POST /api/credentials/import - CSV import
router.post('/import', (req, res) => {
  try {
    const userId = req.session.userId;
    const vaultKey = getVaultKey(req);
    const { csvData } = req.body;

    if (!csvData || typeof csvData !== 'string') {
      return res.status(400).json({ error: 'CSV data is required.' });
    }

    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV must have a header and at least one data row.' });
    }

    function parseCsvLine(line) {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
          if (ch === '"' && line[i + 1] === '"') {
            current += '"';
            i++;
          } else if (ch === '"') {
            inQuotes = false;
          } else {
            current += ch;
          }
        } else {
          if (ch === '"') {
            inQuotes = true;
          } else if (ch === ',') {
            result.push(current.trim());
            current = '';
          } else {
            current += ch;
          }
        }
      }
      result.push(current.trim());
      return result;
    }

    let imported = 0;
    let skipped = 0;
    const errors = [];
    const { getDatabase, saveDatabase } = require('../db');
    const db = getDatabase();

    db.run('BEGIN TRANSACTION;');
    try {
      const dataLines = lines.slice(1).filter(l => l.trim());
      for (let i = 0; i < dataLines.length; i++) {
        try {
          const fields = parseCsvLine(dataLines[i]);
          const [siteName, url, username, password, notes, categoryName] = fields;

          if (!siteName || !password) {
            skipped++;
            errors.push(`Row ${i + 2}: Missing site name or password`);
            continue;
          }

          let categoryId = null;
          if (categoryName) {
            const cat = queryOne(
              'SELECT id FROM categories WHERE user_id = ? AND name = ?',
              [userId, categoryName]
            );
            if (cat) {
              categoryId = cat.id;
            } else {
              categoryId = require('uuid').v4();
              db.run('INSERT INTO categories (id, user_id, name) VALUES (?, ?, ?)',
                [categoryId, userId, categoryName]);
            }
          }

          const { encrypted, iv, authTag } = encrypt(password, vaultKey);
          const id = require('uuid').v4();

          db.run(
            `INSERT INTO credentials (id, user_id, category_id, site_name, url, username, encrypted_password, iv, auth_tag, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, userId, categoryId, siteName, url || '', username || '', encrypted, iv, authTag, notes || '']
          );
          imported++;
        } catch (err) {
          skipped++;
          errors.push(`Row ${i + 2}: ${err.message}`);
        }
      }
      db.run('COMMIT;');
      saveDatabase();
    } catch (err) {
      db.run('ROLLBACK;');
      throw err;
    }

    logger.info('Credentials imported', { userId, imported, skipped });

    res.json({
      message: `Import complete. ${imported} imported, ${skipped} skipped.`,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error('Import error', { error: error.message });
    res.status(500).json({ error: 'Import failed.' });
  }
});

// GET /api/credentials/:id - Get single credential
router.get('/:id', idParamValidation, (req, res) => {
  try {
    const userId = req.session.userId;
    const vaultKey = getVaultKey(req);

    const row = queryOne(
      `SELECT c.*, cat.name as category_name
       FROM credentials c
       LEFT JOIN categories cat ON c.category_id = cat.id
       WHERE c.id = ? AND c.user_id = ?`,
      [req.params.id, userId]
    );

    if (!row) {
      return res.status(404).json({ error: 'Credential not found.' });
    }

    res.json({
      id: row.id,
      siteName: row.site_name,
      url: row.url,
      username: row.username,
      password: decrypt(row.encrypted_password, row.iv, row.auth_tag, vaultKey),
      notes: row.notes,
      categoryId: row.category_id,
      categoryName: row.category_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (error) {
    logger.error('Get credential error', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve credential.' });
  }
});

// PUT /api/credentials/:id - Update credential
router.put('/:id', idParamValidation, credentialUpdateValidation, (req, res) => {
  try {
    const userId = req.session.userId;
    const vaultKey = getVaultKey(req);

    const existing = queryOne(
      'SELECT * FROM credentials WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );
    if (!existing) {
      return res.status(404).json({ error: 'Credential not found.' });
    }

    const sets = [];
    const params = [];

    if (req.body.siteName !== undefined) { sets.push('site_name = ?'); params.push(req.body.siteName); }
    if (req.body.url !== undefined) { sets.push('url = ?'); params.push(req.body.url); }
    if (req.body.username !== undefined) { sets.push('username = ?'); params.push(req.body.username); }
    if (req.body.notes !== undefined) { sets.push('notes = ?'); params.push(req.body.notes); }
    if (req.body.categoryId !== undefined) { sets.push('category_id = ?'); params.push(req.body.categoryId || null); }

    if (req.body.password !== undefined) {
      const { encrypted, iv, authTag } = encrypt(req.body.password, vaultKey);
      sets.push('encrypted_password = ?'); params.push(encrypted);
      sets.push('iv = ?'); params.push(iv);
      sets.push('auth_tag = ?'); params.push(authTag);
    }

    // Duplicate detection
    const newUrl = req.body.url !== undefined ? req.body.url : existing.url;
    const newUsername = req.body.username !== undefined ? req.body.username : existing.username;
    if (newUrl && newUsername) {
      const duplicate = queryOne(
        'SELECT id FROM credentials WHERE user_id = ? AND url = ? AND username = ? AND id != ?',
        [userId, newUrl, newUsername, req.params.id]
      );
      if (duplicate) {
        return res.status(409).json({
          error: 'A credential with this URL and username already exists.',
          duplicateId: duplicate.id,
        });
      }
    }

    sets.push("updated_at = datetime('now')");
    params.push(req.params.id, userId);

    runStatement(
      `UPDATE credentials SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    logger.info('Credential updated', { userId, credentialId: req.params.id });
    res.json({ message: 'Credential updated successfully.' });
  } catch (error) {
    logger.error('Update credential error', { error: error.message });
    res.status(500).json({ error: 'Failed to update credential.' });
  }
});

// DELETE /api/credentials/:id - Delete credential
router.delete('/:id', idParamValidation, (req, res) => {
  try {
    const userId = req.session.userId;

    const existing = queryOne(
      'SELECT id FROM credentials WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );
    if (!existing) {
      return res.status(404).json({ error: 'Credential not found.' });
    }

    runStatement(
      'DELETE FROM credentials WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );

    logger.info('Credential deleted', { userId, credentialId: req.params.id });
    res.json({ message: 'Credential deleted successfully.' });
  } catch (error) {
    logger.error('Delete credential error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete credential.' });
  }
});

module.exports = router;
