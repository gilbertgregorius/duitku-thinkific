const logger = require('../utils/logger.js');
const config = require('../config/index.js');

const duitku = require('../services/duitku.js');
const thinkific = require('../services/thinkific.js');

const { CreateInvoiceRequest, CreateInvoiceResponse } = require('../dto/paymentDto.js');


class PaymentController {
  /**
   * Enhanced order ID generation (from Pipedream pattern)
   */
  generateEnhancedOrderId(customerEmail = null) {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9).toUpperCase();
    const userPrefix = customerEmail ? customerEmail.split('@')[0].substr(0, 3).toUpperCase() : 'USR';
    return `PRODUCT_${userPrefix}_${timestamp}_${randomStr}`;
  }

  /**
   * Enhanced payment validation using DTO pattern
   */
  validatePaymentRequest(paymentData) {
    try {
      // Create DTO from payment data
      const invoiceRequest = CreateInvoiceRequest.fromPaymentData({
        ...paymentData,
        orderId: this.generateEnhancedOrderId(paymentData.customerEmail),
        callbackUrl: paymentData.callbackUrl || `${config.app.baseUrl}/api/payments/callback`,
        returnUrl: paymentData.returnUrl || `${config.app.baseUrl}/payment/success`
      });

      // Use DTO validation
      const dtoErrors = invoiceRequest.validate();
      
      if (dtoErrors.length > 0) {
        return {
          valid: false,
          error: `Validation failed: ${dtoErrors.join(', ')}`,
          errors: dtoErrors,
          payload: invoiceRequest
        };
      }

      return { 
        valid: true, 
        payload: invoiceRequest 
      };

    } catch (error) {
      return {
        valid: false,
        error: `DTO creation failed: ${error.message}`,
        originalError: error
      };
    }
  }

  async initiatePayment(req, res) {    
    try {
      const paymentData = req.body;
      
      const dto = this.validatePaymentRequest(paymentData);
      if (!dto.valid) {
        logger.warn('Payment initiation validation failed', {
          error: dto.error,
          errors: dto.errors,
          customerEmail: paymentData.customerEmail
        });
        
        return res.status(400).json({
          success: false,
          error: dto.error,
          details: dto.errors || dto,
          timestamp: new Date().toISOString()
        });
      }

      const payload = dto.payload;
      const accessToken = await tokenManager.getToken();
      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: 'No valid OAuth token found. Please set ACCESS_TOKEN in .env or complete OAuth installation.',
          timestamp: new Date().toISOString()
        });
      }

      const result = duitku.initiatePayment(payload.toJSON());
      const invoiceResponse = CreateInvoiceResponse.fromDuitkuResponse(result);
      
      logger.info('Payment initiated successfully', {
        invoiceResponse: invoiceResponse.toJSON(),
      });

      // TODO: trigger to external_order and enrollment
      // await thinkific.createExternalOrder(invoiceResponse.toJSON());
      // await thinkific.enrollUserInCourse(invoiceResponse.toJSON());

      res.json(invoiceResponse.toJSON());

    } catch (error) {
      logger.error('Payment initiation error:', error);
      res.status(500).json({
        success: false,
        error: 'Payment initiation failed',
        message: error.message
      });
    }
  }

  async checkTokenStatus(req, res) {
    try {
      const tokenInfo = await tokenManager.getInfo();
      const accessToken = await tokenManager.getToken();

      res.json({
        success: true,
        tokenInfo,
        accessToken: accessToken.substr(0, 10) + '...',
      });

    } catch (error) {
      logger.error('Error checking token status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check token status',
        message: error.message,
      });
    }
  }
}

module.exports = new PaymentController();