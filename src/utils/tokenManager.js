const config = require('../config');
const logger = require('./logger');

class TokenManager {
  constructor() {
    this.tokenStorage = require('./tokenStorage');
    this.initialized = false;
    this.useEnvToken = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      const envToken = process.env.ACCESS_TOKEN;
      const useDatabase = process.env.USE_DATABASE_TOKEN_STORAGE === 'true' || 
                         config.server.environment === 'production';

      if (envToken && !useDatabase) {
        this.useEnvToken = true;
        logger.info('TokenManager initialized with environment variable');
      } else {
        logger.info('TokenManager initialized with database storage');
      }

      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize token manager', error);
      throw error;
    }
  }


  async storeToken(accessToken, refresh_token, expiresAt) {
    await this.initialize();
    
    if (this.useEnvToken) {
      logger.info('Using environment token, skipping storage');
      return true;
    }
    
    return await this.tokenStorage.storeToken(accessToken, refresh_token, expiresAt);
  }

  async getToken() {
    await this.initialize();
    
    if (this.useEnvToken) {
      return process.env.ACCESS_TOKEN;
    }
    
    return await this.tokenStorage.getToken();
  }

  async removeToken() {
    await this.initialize();
    
    if (this.useEnvToken) {
      logger.info('Using environment token, cannot remove');
      return false;
    }
    
    return await this.tokenStorage.removeToken();
  }

  async getInfo() {
    await this.initialize();
    
    if (this.useEnvToken) {
      return [{
        exists: !!process.env.ACCESS_TOKEN,
        stored_in: '.env file'
      }];
    }
    
    const hasToken = await this.tokenStorage.getToken();
    return [{ 
      exists: hasToken !== null ? true : false,
      stored_in: 'database'
    }];
  }
}

module.exports = new TokenManager();
