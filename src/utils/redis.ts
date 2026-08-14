import Redis from 'ioredis';
import logger from './logger';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export const redis = new Redis(redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy: (times) => {
    if (times > 2) {
      logger.warn('Redis unavailable, proceeding with memory session store fallback');
      return null;
    }
    return 1000;
  },
});

redis.on('connect', () => {
  logger.info('Connected to Redis server successfully');
});

redis.on('error', (err) => {
  logger.warn({ error: err.message }, 'Redis connection warning');
});
