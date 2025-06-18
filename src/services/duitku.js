const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

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
  async initiatePayment(paymentData) {
    try {
      const orderId = paymentData.orderId;
      const amount = paymentData.amount;
      const timestamp = this.getJakartaTimestamp();
      const signature = this.generateSignature(this.merchantCode, timestamp, this.apiKey);
      
      const requestData = {
        merchantCode: this.merchantCode,
        paymentAmount: amount,
        paymentMethod: paymentData.paymentMethod,
        merchantOrderId: orderId,
        productDetails: paymentData.productName,
        customerVaName: paymentData.customerName,
        email: paymentData.customerEmail,
        phoneNumber: paymentData.customerPhone.replace(/\D/g, ''),
        itemDetails: [{
          name: paymentData.productName,
          price: amount,
          quantity: 1 // TODO: parse from paymentData
        }],
        customerDetail: {
          firstName: paymentData.customerName.split(' ')[0],
          lastName: paymentData.customerName.split(' ').slice(1).join(' ') || '',
          email: paymentData.customerEmail,
          phoneNumber: paymentData.customerPhone.replace(/\D/g, '')
        },
        returnUrl: paymentData.returnUrl,
        callbackUrl: paymentData.callbackUrl,
        expiryPeriod: 1440, // 24 hours
        signature
      };

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
          timeout: 30000
        }
      );

      if (response.data.statusCode !== "00") {
        throw new Error(`Payment initiation failed: ${response.data.statusMessage || 'Unknown error'}`);
      }

      return {
        success: true,
        orderId,
        reference: response.data.reference,
        paymentUrl: response.data.paymentUrl,
        statusCode: response.data.statusCode,
        statusMessage: response.data.statusMessage,
      };

    } catch (error) {
      logger.error('Duitku payment initiation error:', error);
      throw new Error(`Payment initiation failed: ${error.message}`);
    }
  }
}

module.exports = new Duitku();