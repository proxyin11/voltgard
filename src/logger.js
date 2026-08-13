const winston = require('winston');
const config = require('./config');

const logger = winston.createLogger({
  level: config.isProduction() ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'vaultguard' },
  transports: [
    new winston.transports.Console({
      format: config.isProduction()
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length > 1 
                ? ` ${JSON.stringify(meta)}` 
                : '';
              return `${timestamp} [${level}]: ${message}${metaStr}`;
            })
          ),
      silent: config.isTest(),
    }),
  ],
});

module.exports = logger;
