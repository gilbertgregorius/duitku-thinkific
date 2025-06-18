const redisConfig = require('./redisConfig');
const oauthConfig = require('./oauthConfig');
const duitkuConfig = require('./duitkuConfig');
const thinkificConfig = require('./thinkificConfig');
const webhookConfig = require('./webhookConfig');
const dataStoreConfig = require('./dataStoreConfig');

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
  
  // Modular configurations
  redisConfig,
  oauthConfig,
  duitkuConfig,
  thinkificConfig,
  webhookConfig,
  dataStoreConfig,

  // Validation method
  validate() {
    try {
      oauthConfig.validate();
      duitkuConfig.validate();
      thinkificConfig.validate();
      webhookConfig.validate();
      dataStoreConfig.validateForProduction();
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
      dataStore: dataStoreConfig.getDebugInfo(),
      redis: {
        connected: redisConfig.isConnected
      }
    };
  }
};