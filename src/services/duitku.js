const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { CreateInvoiceRequest, CreateInvoiceResponse } = require('../dto/paymentDto');

class Duitku {
  constructor(config = null) {
    // If no config provided, load it automatically
    if (!config) {
      try {
        const appConfig = require('../config');
        config = appConfig.duitkuConfig;
      } catch (error) {
        throw new Error('DuitkuService requires a configuration object or valid config file');
      }
    }

    this.merchantCode = config.merchantCode;
    this.apiKey = config.apiKey;
    this.environment = config.environment;
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout;
    this.webhookPath = config.webhookPath;

  }

  ///////////////////////
  /// HELPER FUNCTION ///
  ///////////////////////

  generateSignature(merchantCode, timestamp, apiKey) {
    const signatureString = `${merchantCode}${timestamp}${apiKey}`;
    return crypto.createHash('sha256').update(signatureString).digest('hex');
  }

  getJakartaTimestamp() {
    const now = new Date();
    // Jakarta is UTC+7
    const jakartaTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    return jakartaTime.getTime();
  }

  verifyWebhookSignature(data) {
    const { merchantOrderId, amount, receivedSignature } = data;
    const signatureString = `${this.merchantCode}${amount}${merchantOrderId}${this.apiKey}`;
    const calculatedSignature = crypto.createHmac('md5', this.apiKey)
      .update(signatureString)
      .digest('hex');
    
    return calculatedSignature.toLowerCase() === receivedSignature.toLowerCase();
  }

  ///////////////////
  /// MAIN METHOD ///
  ///////////////////
  
  /**
   * Initiate payment using DTO pattern
   * @param {CreateInvoiceRequest|Object} paymentData - Either a DTO instance or plain object
   * @returns {CreateInvoiceResponse} - Structured response DTO
   */
  async initiatePayment(paymentData) {
    try {
      let invoiceRequest;
      if (paymentData instanceof CreateInvoiceRequest) {
        invoiceRequest = paymentData;
      } else {
        // Handle legacy plain object format
        invoiceRequest = this._convertLegacyPaymentData(paymentData);
      }

      // Generate Duitku-specific requirements
      const timestamp = this.getJakartaTimestamp();
      const signature = this.generateSignature(this.merchantCode, timestamp, this.apiKey);
      
      // Build Duitku API request from DTO
      const requestData = this._buildDuitkuRequest(invoiceRequest, signature);

      logger.info('Initiating Duitku payment', {
        orderId: invoiceRequest.merchantOrderId,
        amount: invoiceRequest.paymentAmount,
        email: invoiceRequest.email,
        paymentMethod: invoiceRequest.paymentMethod
      });

      const response = await axios.post(
        `${this.baseUrl}/api/merchant/createInvoice`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-duitku-signature': signature,
            'x-duitku-timestamp': timestamp.toString(),
            'x-duitku-merchantcode': this.merchantCode
          },
          timeout: this.timeout || 30000
        }
      );

      // Validate response
      if (response.data.statusCode !== "00") {
        const errorMsg = response.data.statusMessage || 'Unknown error';
        logger.error('Duitku payment failed', {
          statusCode: response.data.statusCode,
          statusMessage: errorMsg,
          orderId: invoiceRequest.merchantOrderId
        });
        throw new Error(`Payment initiation failed: ${errorMsg}`);
      }

      // Create structured response DTO
      const invoiceResponse = new CreateInvoiceResponse(
        this.merchantCode,
        response.data.reference,
        response.data.paymentUrl,
        response.data.amount || invoiceRequest.paymentAmount.toString(),
        response.data.statusCode,
        response.data.statusMessage
      );

      logger.info('Duitku payment initiated successfully', {
        orderId: invoiceRequest.merchantOrderId,
        reference: invoiceResponse.reference,
        paymentUrl: invoiceResponse.paymentUrl
      });

      // Return enhanced response with additional Duitku fields
      return {
        ...invoiceResponse.toJSON(),
      };

    } catch (error) {
      logger.error('Duitku payment initiation error:', {
        error: error.message,
        stack: error.stack,
        paymentData: paymentData instanceof CreateInvoiceRequest ? 
          { orderId: paymentData.merchantOrderId, amount: paymentData.paymentAmount } : 
          { orderId: paymentData?.orderId, amount: paymentData?.amount }
      });
      throw new Error(`Payment initiation failed: ${error.message}`);
    }
  }

  /**
   * Build Duitku API request from DTO
   * @private
   */
  _buildDuitkuRequest(invoiceRequest, signature) {
    return {
      merchantCode: this.merchantCode,
      paymentAmount: invoiceRequest.paymentAmount,
      paymentMethod: invoiceRequest.paymentMethod,
      merchantOrderId: invoiceRequest.merchantOrderId,
      productDetails: invoiceRequest.productDetails,
      customerVaName: invoiceRequest.customerVaName,
      email: invoiceRequest.email,
      phoneNumber: invoiceRequest.phoneNumber?.replace(/\D/g, '') || '',
      itemDetails: invoiceRequest.itemDetails.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      customerDetail: invoiceRequest.customerDetail ? {
        firstName: invoiceRequest.customerDetail.firstName,
        lastName: invoiceRequest.customerDetail.lastName,
        email: invoiceRequest.customerDetail.email,
        phoneNumber: invoiceRequest.customerDetail.phoneNumber?.replace(/\D/g, '') || ''
      } : null,
      returnUrl: invoiceRequest.returnUrl,
      callbackUrl: invoiceRequest.callbackUrl,
      expiryPeriod: invoiceRequest.expiryPeriod || 1440,
      additionalParam: invoiceRequest.additionalParam,
      merchantUserInfo: invoiceRequest.merchantUserInfo,
      signature
    };
  }

  /**
   * Convert legacy payment data format to DTO
   * @private
   */
  _convertLegacyPaymentData(paymentData) {
    // Handle legacy format for backward compatibility
    const legacyMapping = {
      paymentAmount: paymentData.amount || paymentData.paymentAmount,
      merchantOrderId: paymentData.orderId || paymentData.merchantOrderId,
      productDetails: paymentData.productName || paymentData.productDetails,
      email: paymentData.customerEmail || paymentData.email,
      callbackUrl: paymentData.callbackUrl,
      returnUrl: paymentData.returnUrl,
      customerVaName: paymentData.customerName || paymentData.customerVaName,
      phoneNumber: paymentData.customerPhone || paymentData.phoneNumber,
      paymentMethod: paymentData.paymentMethod,
      productName: paymentData.productName,
      productDescription: paymentData.productDescription,
      customerName: paymentData.customerName,
      itemDetails: paymentData.itemDetails || [{
        name: paymentData.productName,
        price: paymentData.amount || paymentData.paymentAmount,
        quantity: 1
      }],
      customerDetail: paymentData.customerDetail || {
        firstName: paymentData.customerName?.split(' ')[0],
        lastName: paymentData.customerName?.split(' ').slice(1).join(' ') || '',
        email: paymentData.customerEmail || paymentData.email,
        phoneNumber: paymentData.customerPhone?.replace(/\D/g, '') || ''
      }
    };

    return new CreateInvoiceRequest(legacyMapping);
  }

  /**
   * Simple webhook signature verification
   * @param {Object} webhookData - Raw webhook data from Duitku
   * @returns {Object} - Simple validation result
   */
  processWebhook(webhookData) {
    try {
      // Validate required webhook fields
      const requiredFields = ['merchantOrderId', 'resultCode', 'signature'];
      const missingFields = requiredFields.filter(field => !webhookData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required webhook fields: ${missingFields.join(', ')}`);
      }

      // Verify webhook signature (if amount is provided)
      if (webhookData.amount) {
        const isSignatureValid = this.verifyWebhookSignature({
          merchantOrderId: webhookData.merchantOrderId,
          amount: webhookData.amount,
          receivedSignature: webhookData.signature
        });

        if (!isSignatureValid) {
          throw new Error('Invalid webhook signature');
        }
      }

      // Return simple processed webhook data
      return {
        valid: true,
        orderId: webhookData.merchantOrderId,
        resultCode: webhookData.resultCode,
        isSuccess: webhookData.resultCode === '00',
        reference: webhookData.reference,
        amount: webhookData.amount ? parseFloat(webhookData.amount) : null,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Webhook processing error:', {
        error: error.message,
        orderId: webhookData?.merchantOrderId,
        resultCode: webhookData?.resultCode
      });
      
      return {
        valid: false,
        error: error.message,
        orderId: webhookData?.merchantOrderId,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new Duitku();