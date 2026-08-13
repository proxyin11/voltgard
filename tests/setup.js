const path = require('path');
const fs = require('fs');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_PATH = path.join(__dirname, '..', 'db', 'test.sqlite');
process.env.SESSION_SECRET = 'test-secret-key-for-testing';
process.env.PBKDF2_ITERATIONS = '1000'; // Speed up tests
process.env.BCRYPT_ROUNDS = '4'; // Speed up tests

// Clean up test database before tests
beforeAll(() => {
  const dbPath = process.env.DB_PATH;
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
});
