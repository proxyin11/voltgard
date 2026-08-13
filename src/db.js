const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

let db = null;
let dbPath = null;

function getDbPath(customPath) {
  const config = require('./config');
  const resolvedPath = customPath || config.db.path;
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return resolvedPath;
}

async function initializeDatabase(customPath) {
  dbPath = getDbPath(customPath);
  
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON;');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, name)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS credentials (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category_id TEXT,
      site_name TEXT NOT NULL,
      url TEXT DEFAULT '',
      username TEXT DEFAULT '',
      encrypted_password TEXT NOT NULL,
      iv TEXT NOT NULL,
      auth_tag TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );
  `);

  // Create indexes (using IF NOT EXISTS isn't supported for all index ops in sql.js, so try/catch)
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_credentials_category_id ON credentials(category_id);',
    'CREATE INDEX IF NOT EXISTS idx_credentials_site_name ON credentials(site_name);',
    'CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
  ];
  for (const idx of indexes) {
    try { db.run(idx); } catch(e) { /* index may already exist */ }
  }

  saveDatabase();
  logger.info('Database initialized', { path: dbPath });
  return db;
}

function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

function saveDatabase() {
  if (db && dbPath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}

/**
 * Helper: run a query and return all result rows as an array of objects.
 */
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/**
 * Helper: run a query and return the first result row as an object, or null.
 */
function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Helper: run a statement (INSERT, UPDATE, DELETE) and return changes info.
 */
function runStatement(sql, params = []) {
  db.run(sql, params);
  const changes = db.getRowsModified();
  saveDatabase();
  return { changes };
}

/**
 * Helper: run multiple statements in a transaction.
 */
function transaction(fn) {
  db.run('BEGIN TRANSACTION;');
  try {
    const result = fn();
    db.run('COMMIT;');
    saveDatabase();
    return result;
  } catch (error) {
    db.run('ROLLBACK;');
    throw error;
  }
}

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase,
  saveDatabase,
  queryAll,
  queryOne,
  runStatement,
  transaction,
};
