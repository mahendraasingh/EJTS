/**
 * Redis In-Memory Database Connector
 * Uses ioredis for high-performance key-value operations, TTL sessions, and Sorted Sets.
 */
const Redis = require('ioredis');
require('dotenv').config();

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  db: parseInt(process.env.REDIS_DB || '0', 10),
  retryStrategy(times) {
    const delay = Math.min(times * 200, 3000);
    return delay;
  },
  maxRetriesPerRequest: 3,
};

if (process.env.REDIS_PASSWORD) {
  redisConfig.password = process.env.REDIS_PASSWORD;
}

const redis = new Redis(redisConfig);

redis.on('connect', () => {
  console.log('✅ [Redis] Connection established.');
});

redis.on('error', (err) => {
  console.error('❌ [Redis] Error:', err.message);
});

async function testRedisConnection() {
  try {
    const ping = await redis.ping();
    if (ping === 'PONG') {
      console.log('✅ [Redis] PING received PONG successfully.');
      return true;
    }
    return false;
  } catch (err) {
    console.error('❌ [Redis] PING failed:', err.message);
    return false;
  }
}

module.exports = {
  redis,
  testRedisConnection,
};
