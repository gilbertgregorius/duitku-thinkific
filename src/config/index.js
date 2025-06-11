const redisConfig = require('./redis');
const oauthConfig = require('./oauth');
const apisConfig = require('./apis');

module.exports = {
  // Legacy compatibility - keeping old structure
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'course_enrollment',
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  duitku: {
    merchantCode: process.env.DUITKU_MERCHANT_CODE,
    apiKey: process.env.DUITKU_API_KEY,
    environment: process.env.DUITKU_ENVIRONMENT || 'sandbox'
  },
  thinkific: {
    apiKey: process.env.THINKIFIC_API_KEY,
    subdomain: process.env.THINKIFIC_SUBDOMAIN
  },
  app: {
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
    logLevel: process.env.LOG_LEVEL || 'info'
  },
  server: {
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development'
  },
  
  // New modular configs
  redisConfig,
  oauthConfig,
  apisConfig,

  // Validation method
  validate() {
    try {
      oauthConfig.validate();
      apisConfig.validate();
      return true;
    } catch (error) {
      throw error;
    }
  },

  // Debug information
  getDebugInfo() {
    return {
      server: {
        port: this.server.port,
        environment: this.server.environment,
        nodeVersion: process.version
      },
      oauth: oauthConfig.getDebugInfo(),
      apis: apisConfig.getDebugInfo(),
      redis: {
        url: this.redis.url,
        connected: redisConfig.isConnected
      }
    };
  }
};