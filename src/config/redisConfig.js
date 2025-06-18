const redis = require('redis');
const logger = require('../utils/logger');

class RedisConfig {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis server refused connection');
            return new Error('Redis server refused connection');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            logger.error('Redis retry time exhausted');
            return new Error('Redis retry time exhausted');
          }
          if (options.attempt > 10) {
            logger.error('Redis max retry attempts reached');
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis Client Connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis Client Ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        logger.warn('Redis Client Disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      return this.client;

    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  getClient() {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }
    return this.client;
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
      logger.info('Redis client disconnected');
    }
  }

  // Helper methods for common Redis operations
  async set(key, value, expirationInSeconds = null) {
    try {
      const client = this.getClient();
      if (expirationInSeconds) {
        await client.setEx(key, expirationInSeconds, JSON.stringify(value));
      } else {
        await client.set(key, JSON.stringify(value));
      }
      return true;
    } catch (error) {
      logger.error('Redis SET error:', error.message);
      return false;
    }
  }

  async get(key) {
    try {
      const client = this.getClient();
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis GET error:', error.message);
      return null;
    }
  }

  async del(key) {
    try {
      const client = this.getClient();
      return await client.del(key);
    } catch (error) {
      logger.error('Redis DEL error:', error.message);
      return false;
    }
  }

  async exists(key) {
    try {
      const client = this.getClient();
      return await client.exists(key);
    } catch (error) {
      logger.error('Redis EXISTS error:', error.message);
      return false;
    }
  }

  async expire(key, seconds) {
    try {
      const client = this.getClient();
      return await client.expire(key, seconds);
    } catch (error) {
      logger.error('Redis EXPIRE error:', error.message);
      return false;
    }
  }

  async flushAll() {
    try {
      const client = this.getClient();
      return await client.flushAll();
    } catch (error) {
      logger.error('Redis FLUSHALL error:', error.message);
      return false;
    }
  }

  validate() {
    // Redis validation can be done during connection
    // This method exists for consistency with other configs
    return true;
  }

  getDebugInfo() {
    return {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      connected: this.isConnected,
      client: this.client ? 'INITIALIZED' : 'NOT_INITIALIZED'
    };
  }
}

module.exports = new RedisConfig();