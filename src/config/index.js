const redisConfig = require('./redis');
const oauthConfig = require('./oauth');
const duitkuConfig = require('./duitku');
const thinkificConfig = require('./thinkific');
const webhookConfig = require('./webhook');

module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development'
  },
  
  // App configuration
  app: {
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
    logLevel: process.env.LOG_LEVEL || 'info'
  },

  // Legacy database config (if still needed)
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'duitku_thinkific',
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  },
  
  // Modular configurations
  redisConfig,
  oauthConfig,
  duitkuConfig,
  thinkificConfig,
  webhookConfig,

  // Validation method
  validate() {
    try {
      oauthConfig.validate();
      duitkuConfig.validate();
      thinkificConfig.validate();
      webhookConfig.validate();
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
      app: {
        baseUrl: this.app.baseUrl,
        logLevel: this.app.logLevel
      },
      oauth: oauthConfig.getDebugInfo(),
      duitku: duitkuConfig.getDebugInfo(),
      thinkific: thinkificConfig.getDebugInfo(),
      webhook: webhookConfig.getDebugInfo(),
      redis: {
        connected: redisConfig.isConnected
      }
    };
  }
};