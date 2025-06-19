const logger = require('../utils/logger.js');
const config = require('../config/index.js');

const duitku = require('../services/duitku.js');

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
        callbackUrl: paymentData.callbackUrl || `${config.app.baseUrl}/payments/callback`,
        returnUrl: paymentData.returnUrl || `${config.app.baseUrl}/payments/success`,
        additionalParam: JSON.stringify({
          customerEmail: paymentData.customerEmail,
          productId: paymentData.productId
        })
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

  async createInvoice(req, res) {    
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
      const result = duitku.createInvoice(payload);
      const response = CreateInvoiceResponse.fromDuitkuResponse(result);
      
      logger.info('Payment initiated successfully', {
        invoiceResponse: response.toJSON(),
      });

      res.json(response.toJSON());
    } catch (error) {
      logger.error('Payment initiation error:', error);
      res.status(500).json({
        success: false,
        error: 'Payment initiation failed',
        message: error.message
      });
    }
  }
}

module.exports = new PaymentController();