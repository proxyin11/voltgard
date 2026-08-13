const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware that checks for validation errors and returns 400 if any.
 */
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

// Auth validators
const registerValidation = [
  body('email')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email too long'),
  body('masterPassword')
    .isLength({ min: 8 }).withMessage('Master password must be at least 8 characters')
    .isLength({ max: 128 }).withMessage('Master password too long'),
  handleValidation,
];

const loginValidation = [
  body('email')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('masterPassword')
    .notEmpty().withMessage('Master password is required'),
  handleValidation,
];

// Credential validators
const credentialValidation = [
  body('siteName')
    .trim()
    .notEmpty().withMessage('Site name is required')
    .isLength({ max: 255 }).withMessage('Site name too long')
    .escape(),
  body('url')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2048 }).withMessage('URL too long'),
  body('username')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 255 }).withMessage('Username too long'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ max: 1024 }).withMessage('Password too long'),
  body('notes')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 5000 }).withMessage('Notes too long'),
  body('categoryId')
    .optional({ values: 'falsy' })
    .trim(),
  handleValidation,
];

const credentialUpdateValidation = [
  body('siteName')
    .optional()
    .trim()
    .notEmpty().withMessage('Site name cannot be empty')
    .isLength({ max: 255 }).withMessage('Site name too long')
    .escape(),
  body('url')
    .optional()
    .trim()
    .isLength({ max: 2048 }).withMessage('URL too long'),
  body('username')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('Username too long'),
  body('password')
    .optional()
    .isLength({ max: 1024 }).withMessage('Password too long'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('Notes too long'),
  body('categoryId')
    .optional({ nullable: true })
    .trim(),
  handleValidation,
];

// Category validators
const categoryValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Category name is required')
    .isLength({ max: 100 }).withMessage('Category name too long')
    .escape(),
  handleValidation,
];

// Search validator
const searchValidation = [
  query('q')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('Search query too long'),
  handleValidation,
];

// ID param validator
const idParamValidation = [
  param('id')
    .trim()
    .notEmpty().withMessage('ID is required'),
  handleValidation,
];

// Password generator validator
const generatorValidation = [
  body('length')
    .optional()
    .isInt({ min: 4, max: 128 }).withMessage('Length must be between 4 and 128'),
  body('uppercase')
    .optional()
    .isBoolean().withMessage('uppercase must be boolean'),
  body('lowercase')
    .optional()
    .isBoolean().withMessage('lowercase must be boolean'),
  body('digits')
    .optional()
    .isBoolean().withMessage('digits must be boolean'),
  body('symbols')
    .optional()
    .isBoolean().withMessage('symbols must be boolean'),
  handleValidation,
];

// Change password validator
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .isLength({ max: 128 }).withMessage('New password too long'),
  handleValidation,
];

module.exports = {
  handleValidation,
  registerValidation,
  loginValidation,
  credentialValidation,
  credentialUpdateValidation,
  categoryValidation,
  searchValidation,
  idParamValidation,
  generatorValidation,
  changePasswordValidation,
};
