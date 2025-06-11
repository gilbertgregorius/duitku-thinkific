const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Idempotency middleware to prevent duplicate requests
 * Uses Redis to store request signatures and prevent duplicate processing
 */
class IdempotencyMiddleware {
  constructor(redisClient, options = {}) {
    this.redis = redisClient;
    this.ttl = options.ttl || 300; // 5 minutes default
    this.headerName = options.headerName || 'X-Idempotency-Key';
  }

  middleware() {
    return async (req, res, next) => {
      // Only apply to POST, PUT, PATCH requests
      if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
        return next();
      }

      const idempotencyKey = req.headers[this.headerName.toLowerCase()];
      
      if (!idempotencyKey) {
        return res.status(400).json({
          error: 'Missing idempotency key',
          message: `${this.headerName} header is required for ${req.method} requests`
        });
      }

      try {
        // Create unique key for this request
        const requestSignature = this.generateRequestSignature(req, idempotencyKey);
        const cacheKey = `idempotency:${requestSignature}`;

        // Check if request was already processed
        const cachedResponse = await this.redis.get(cacheKey);
        
        if (cachedResponse) {
          const parsed = JSON.parse(cachedResponse);
          logger.info('Returning cached response for idempotent request', {
            idempotencyKey,
            method: req.method,
            path: req.path
          });
          
          return res.status(parsed.status).json(parsed.data);
        }

        // Store original response methods
        const originalSend = res.send;
        const originalJson = res.json;
        let responseIntercepted = false;

        // Intercept response to cache it
        const interceptResponse = (data, status = res.statusCode) => {
          if (!responseIntercepted && status >= 200 && status < 300) {
            responseIntercepted = true;
            
            // Cache successful response
            const responseData = {
              status,
              data: typeof data === 'string' ? JSON.parse(data) : data
            };
            
            this.redis.setex(cacheKey, this.ttl, JSON.stringify(responseData))
              .catch(err => logger.error('Failed to cache idempotent response', err));
          }
        };

        // Override response methods
        res.send = function(data) {
          interceptResponse(data);
          return originalSend.call(this, data);
        };

        res.json = function(data) {
          interceptResponse(data, this.statusCode);
          return originalJson.call(this, data);
        };

        next();

      } catch (error) {
        logger.error('Idempotency middleware error:', error);
        next();
      }
    };
  }

  generateRequestSignature(req, idempotencyKey) {
    const payload = {
      method: req.method,
      path: req.path,
      body: req.body,
      idempotencyKey
    };
    
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
  }
}

module.exports = IdempotencyMiddleware;
