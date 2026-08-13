require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  
  session: {
    secret: process.env.SESSION_SECRET || 'fallback-dev-secret',
    timeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES, 10) || 15,
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    pbkdf2Iterations: parseInt(process.env.PBKDF2_ITERATIONS, 10) || 600000,
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    rateLimitMaxAttempts: parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS, 10) || 5,
  },

  db: {
    path: process.env.DB_PATH || './db/vaultguard.sqlite',
    sessionPath: process.env.SESSION_DB_PATH || './db/sessions.sqlite',
  },

  isProduction: () => config.env === 'production',
  isTest: () => config.env === 'test',
};

module.exports = config;
