const logger = require('./logger');

class TokenStorage {
  constructor() {
    this.dataStore = require('../services/dataStore');
    this.key = 'access_token';
  }

  /**
   * Store JWT token in database with optional expiration
   */
  async storeToken(accessToken, refresh_token, expiresAt) {
    try {
      const tokenData = {
        accessToken,
        refresh_token,
        createdAt: new Date().toISOString(),
        expiresAt,
        lastUsed: new Date().toISOString()
      };

      await this.dataStore.set(`${this.key}`, tokenData, 30 * 24 * 60 * 60);

      logger.info('[utils/token_storage] Token stored in database');
      return true;
    } catch (error) {
      logger.error('[utils/token_storage] Error storing token in database', {
        key: this.key,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Retrieve JWT token from database
   */
  async getToken() {
    try {
      const storageKey = `${this.key}`;
      const tokenData = await this.dataStore.get(storageKey);
      
      if (!tokenData) {
        logger.warn('[utils/token_storage] Token not found in database', { key: this.key });
        return null;
      }
      
      // Check if token is expired
      if (tokenData.expiresAt && new Date(tokenData.expiresAt) <= new Date()) {
        logger.warn('[utils/token_storage] Token expired, removing from database', {
          key: this.key,
          expiresAt: tokenData.expiresAt
        });
        await this.removeToken(this.key);
        return null;
      }
      
      // Update last used timestamp
      tokenData.lastUsed = new Date().toISOString();
      await this.dataStore.set(storageKey, tokenData, 30 * 24 * 60 * 60); // Extend TTL

      logger.info('[utils/token_storage] Token retrieved from database');
      return tokenData.accessToken;
    } catch (error) {
      logger.error('[utils/token_storage] Error retrieving token from database', { key: this.key, error: error.message });
      return null;
    }
  }

  /**
   * Remove token from database
   */
  async removeToken() {
    try {
      await this.dataStore.delete(this.key);
      logger.info('Token removed from database');
      return true;
    } catch (error) {
      logger.error('Error removing token from database', { key: this.key, error: error.message });
      return false;
    }
  }
}

module.exports = new TokenStorage();