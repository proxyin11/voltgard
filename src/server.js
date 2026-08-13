const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const logger = require('./logger');
const { initializeDatabase, closeDatabase } = require('./db');

// Import routes
const authRoutes = require('./routes/auth');
const credentialRoutes = require('./routes/credentials');
const categoryRoutes = require('./routes/categories');
const generatorRoutes = require('./routes/generator');
const accountRoutes = require('./routes/account');
const { checkSessionTimeout } = require('./middleware/auth');

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
    },
  },
}));

// CORS
app.use(cors({
  origin: config.isProduction() ? false : true,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// Session setup
const sessionConfig = {
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.isProduction(),
    httpOnly: true,
    maxAge: config.session.timeoutMinutes * 60 * 1000,
    sameSite: 'lax',
  },
};

app.use(session(sessionConfig));

// Session timeout check
app.use(checkSessionTimeout(config.session.timeoutMinutes));

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/generate-password', generatorRoutes);
app.use('/api/account', accountRoutes);

// SPA fallback
app.get('/vault', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'vault.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// 404 handler
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found.' });
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: config.isProduction() ? undefined : err.stack,
    path: req.path,
    method: req.method,
  });
  res.status(500).json({
    error: config.isProduction()
      ? 'An unexpected error occurred.'
      : err.message,
  });
});

// Start server
let server;

async function startServer() {
  await initializeDatabase();

  return new Promise((resolve) => {
    server = app.listen(config.port, () => {
      logger.info(`VaultGuard running on http://localhost:${config.port}`, {
        env: config.env,
        port: config.port,
      });
      resolve(server);
    });
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        closeDatabase();
        resolve();
      });
    } else {
      closeDatabase();
      resolve();
    }
  });
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await stopServer();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  await stopServer();
  process.exit(0);
});

if (require.main === module) {
  startServer().catch(err => {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  });
}

module.exports = { app, startServer, stopServer };
