/**
 * DataStore Configuration (PostgreSQL + Redis)
 */
class DataStoreConfig {
  constructor() {
    // PostgreSQL configuration
    this.database = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'duitku_thinkific',
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
    };

    // Redis configuration
    this.redis = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || null,
      db: parseInt(process.env.REDIS_DB) || 0,
      retryDelayOnFailure: parseInt(process.env.REDIS_RETRY_DELAY) || 100,
      maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES) || 3,
    };

    // Connection settings
    this.timeout = parseInt(process.env.DATASTORE_TIMEOUT) || 5000;
    this.retries = parseInt(process.env.DATASTORE_RETRIES) || 3;
  }

  getRedisUrl() {
    if (this.redis.url) {
      return this.redis.url;
    }
    
    // Construct URL from individual components
    let url = 'redis://';
    if (this.redis.password) {
      url += `:${this.redis.password}@`;
    }
    url += `${this.redis.host}:${this.redis.port}`;
    if (this.redis.db > 0) {
      url += `/${this.redis.db}`;
    }
    
    return url;
  }

  getDatabaseUrl() {
    const { host, port, database, username, password } = this.database;
    return `postgresql://${username}:${password}@${host}:${port}/${database}`;
  }

  // Optional validation - only call when needed
  validateForProduction() {
    const errors = [];
    
    // Database validation
    if (!this.database.host) errors.push('DB_HOST is required');
    if (!this.database.database) errors.push('DB_NAME is required');
    if (!this.database.username) errors.push('DB_USERNAME is required');
    if (!this.database.password) errors.push('DB_PASSWORD is required');
    
    // Redis validation (less strict as it might be optional)
    if (!this.redis.url && !this.redis.host) {
      errors.push('REDIS_URL or REDIS_HOST is required');
    }
    
    if (errors.length > 0) {
      throw new Error(`DataStore configuration errors: ${errors.join(', ')}`);
    }
  }

  // Validate specific components
  validateDatabase() {
    const errors = [];
    if (!this.database.host) errors.push('DB_HOST is required');
    if (!this.database.database) errors.push('DB_NAME is required');
    if (!this.database.username) errors.push('DB_USERNAME is required');
    if (!this.database.password) errors.push('DB_PASSWORD is required');
    
    if (errors.length > 0) {
      throw new Error(`Database configuration errors: ${errors.join(', ')}`);
    }
  }

  validateRedis() {
    if (!this.redis.url && !this.redis.host) {
      throw new Error('Redis configuration error: REDIS_URL or REDIS_HOST is required');
    }
  }

  getDebugInfo() {
    return {
      database: {
        host: this.database.host,
        port: this.database.port,
        database: this.database.database,
        username: this.database.username,
        password: this.database.password ? 'SET' : 'NOT_SET',
        maxConnections: this.database.max,
        timeout: this.database.connectionTimeoutMillis
      },
      redis: {
        url: this.getRedisUrl(),
        host: this.redis.host,
        port: this.redis.port,
        password: this.redis.password ? 'SET' : 'NOT_SET',
        db: this.redis.db
      },
      settings: {
        timeout: this.timeout,
        retries: this.retries
      }
    };
  }
}

module.exports = new DataStoreConfig();