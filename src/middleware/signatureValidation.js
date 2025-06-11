const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Signature validation middleware for webhooks
 * Validates signatures from Duitku and Thinkific webhooks
 */
class SignatureValidation {
  
  /**
   * Validate Duitku webhook signature
   */
  static validateDuitkuSignature(merchantCode, apiKey) {
    return (req, res, next) => {
      try {
        const { merchantOrderId, amount, signature } = req.body;
        
        if (!signature) {
          logger.warn('Missing signature in Duitku webhook', { body: req.body });
          return res.status(400).json({ error: 'Missing signature' });
        }

        // Generate expected signature
        const signatureString = `${merchantCode}${amount}${merchantOrderId}${apiKey}`;
        const expectedSignature = crypto
          .createHash('md5')
          .update(signatureString)
          .digest('hex');

        if (expectedSignature.toLowerCase() !== signature.toLowerCase()) {
          logger.error('Invalid Duitku webhook signature', {
            expected: expectedSignature,
            received: signature,
            merchantOrderId
          });
          return res.status(401).json({ error: 'Invalid signature' });
        }

        logger.info('Duitku webhook signature validated', { merchantOrderId });
        next();

      } catch (error) {
        logger.error('Duitku signature validation error:', error);
        res.status(500).json({ error: 'Signature validation failed' });
      }
    };
  }

  /**
   * Validate Thinkific webhook signature
   */
  static validateThinkificSignature(webhookSecret) {
    return (req, res, next) => {
      try {
        const signature = req.headers['x-thinkific-hmac-sha256'];
        
        if (!signature) {
          logger.warn('Missing Thinkific webhook signature');
          return res.status(400).json({ error: 'Missing signature header' });
        }

        // Generate expected signature
        const expectedSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(JSON.stringify(req.body))
          .digest('base64');

        if (signature !== expectedSignature) {
          logger.error('Invalid Thinkific webhook signature', {
            expected: expectedSignature,
            received: signature
          });
          return res.status(401).json({ error: 'Invalid signature' });
        }

        logger.info('Thinkific webhook signature validated');
        next();

      } catch (error) {
        logger.error('Thinkific signature validation error:', error);
        res.status(500).json({ error: 'Signature validation failed' });
      }
    };
  }

  /**
   * Generic HMAC signature validation
   */
  static validateHmacSignature(secret, headerName = 'x-signature', algorithm = 'sha256') {
    return (req, res, next) => {
      try {
        const signature = req.headers[headerName.toLowerCase()];
        
        if (!signature) {
          return res.status(400).json({ 
            error: 'Missing signature header',
            expected: headerName 
          });
        }

        const expectedSignature = crypto
          .createHmac(algorithm, secret)
          .update(JSON.stringify(req.body))
          .digest('hex');

        // Handle different signature formats (with/without prefix)
        const cleanSignature = signature.replace(/^(sha256=|sha1=)/, '');
        
        if (expectedSignature !== cleanSignature) {
          logger.error('Invalid HMAC signature', {
            algorithm,
            headerName,
            expected: expectedSignature,
            received: cleanSignature
          });
          return res.status(401).json({ error: 'Invalid signature' });
        }

        next();

      } catch (error) {
        logger.error('HMAC signature validation error:', error);
        res.status(500).json({ error: 'Signature validation failed' });
      }
    };
  }

  /**
   * Rate limiting for webhook endpoints
   */
  static webhookRateLimit(windowMs = 60000, max = 100) {
    const rateLimit = require('express-rate-limit');
    
    return rateLimit({
      windowMs,
      max,
      message: 'Too many webhook requests',
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health';
      }
    });
  }
}

module.exports = SignatureValidation;
