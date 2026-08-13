const logger = require('../logger');

/**
 * Middleware that requires an authenticated session.
 * Checks for session userId and vaultKey.
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    logger.warn('Unauthorized access attempt', { 
      ip: req.ip, 
      path: req.path,
      method: req.method 
    });
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  
  if (!req.session.vaultKey) {
    logger.warn('Session missing vault key', { userId: req.session.userId });
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  // Update last activity for session timeout tracking
  req.session.lastActivity = Date.now();
  next();
}

/**
 * Middleware that checks session timeout.
 */
function checkSessionTimeout(timeoutMinutes) {
  return (req, res, next) => {
    if (req.session && req.session.lastActivity) {
      const elapsed = Date.now() - req.session.lastActivity;
      const timeoutMs = timeoutMinutes * 60 * 1000;
      
      if (elapsed > timeoutMs) {
        logger.info('Session timed out', { userId: req.session.userId });
        req.session.destroy((err) => {
          if (err) {
            logger.error('Error destroying timed-out session', { error: err.message });
          }
          return res.status(401).json({ error: 'Session timed out. Please log in again.' });
        });
        return;
      }
    }
    next();
  };
}

module.exports = { requireAuth, checkSessionTimeout };
