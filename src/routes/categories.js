const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { queryAll, queryOne, runStatement } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { categoryValidation, idParamValidation } = require('../middleware/validator');
const logger = require('../logger');

const router = express.Router();

router.use(requireAuth);

// GET /api/categories
router.get('/', (req, res) => {
  try {
    const userId = req.session.userId;

    const categories = queryAll(
      `SELECT c.id, c.name, c.created_at,
        (SELECT COUNT(*) FROM credentials cr WHERE cr.category_id = c.id) as credential_count
       FROM categories c
       WHERE c.user_id = ?
       ORDER BY c.name ASC`,
      [userId]
    );

    res.json(categories);
  } catch (error) {
    logger.error('List categories error', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve categories.' });
  }
});

// POST /api/categories
router.post('/', categoryValidation, (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.session.userId;

    const existing = queryOne(
      'SELECT id FROM categories WHERE user_id = ? AND name = ?',
      [userId, name]
    );
    if (existing) {
      return res.status(409).json({ error: 'A category with this name already exists.' });
    }

    const id = uuidv4();
    runStatement(
      'INSERT INTO categories (id, user_id, name) VALUES (?, ?, ?)',
      [id, userId, name]
    );

    logger.info('Category created', { userId, categoryId: id, name });
    res.status(201).json({ id, name, message: 'Category created successfully.' });
  } catch (error) {
    logger.error('Create category error', { error: error.message });
    res.status(500).json({ error: 'Failed to create category.' });
  }
});

// PUT /api/categories/:id
router.put('/:id', idParamValidation, categoryValidation, (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.session.userId;

    const existing = queryOne(
      'SELECT id FROM categories WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );
    if (!existing) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    const duplicate = queryOne(
      'SELECT id FROM categories WHERE user_id = ? AND name = ? AND id != ?',
      [userId, name, req.params.id]
    );
    if (duplicate) {
      return res.status(409).json({ error: 'A category with this name already exists.' });
    }

    runStatement(
      'UPDATE categories SET name = ? WHERE id = ? AND user_id = ?',
      [name, req.params.id, userId]
    );

    logger.info('Category updated', { userId, categoryId: req.params.id });
    res.json({ message: 'Category updated successfully.' });
  } catch (error) {
    logger.error('Update category error', { error: error.message });
    res.status(500).json({ error: 'Failed to update category.' });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', idParamValidation, (req, res) => {
  try {
    const userId = req.session.userId;

    const existing = queryOne(
      'SELECT id FROM categories WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );
    if (!existing) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    runStatement(
      'DELETE FROM categories WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    );

    logger.info('Category deleted', { userId, categoryId: req.params.id });
    res.json({ message: 'Category deleted successfully.' });
  } catch (error) {
    logger.error('Delete category error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete category.' });
  }
});

module.exports = router;
