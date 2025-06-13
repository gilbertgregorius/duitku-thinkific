const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

class DuitkuService {
  constructor(config) {
    // Use the new APIs config if available, fallback to legacy config
    if (config.apis && config.apis.duitku) {
      // New modular approach
      this.merchantCode = config.apis.duitku.merchantCode;
      this.apiKey = config.apis.duitku.apiKey;
      this.baseUrl = config.apis.duitku.baseUrl;
      this.environment = config.apis.duitku.environment;
      this.timeout = config.apis.duitku.timeout;
    } else {
      // Legacy approach compatibility
      this.merchantCode = config.merchantCode;
      this.apiKey = config.apiKey;
      this.baseUrl = config.environment === 'production' 
        ? 'https://passport.duitku.com'
        : 'https://sandbox.duitku.com';
      this.environment = config.environment;
      this.timeout = 30000;
    }
  }

  generateOrderId() {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9).toUpperCase();
    return `COURSE_${timestamp}_${randomStr}`;
  }

  generateSignature(merchantCode, orderId, amount, apiKey) {
    const signatureString = `${merchantCode}${orderId}${amount}${apiKey}`;
    return crypto.createHash('md5').update(signatureString).digest('hex');
  }

  verifyWebhookSignature(data) {
    const { merchantOrderId, amount, signature: receivedSignature } = data;
    const signatureString = `${this.merchantCode}${amount}${merchantOrderId}${this.apiKey}`;
    const calculatedSignature = crypto.createHmac('md5', this.apiKey)
      .update(signatureString)
      .digest('hex');
    
    return calculatedSignature.toLowerCase() === receivedSignature.toLowerCase();
  }

  async initiatePayment(paymentData) {
    try {
      const orderId = this.generateOrderId();
      const amount = paymentData.coursePrice || paymentData.amount;
      const signature = this.generateSignature(
        this.merchantCode, 
        orderId, 
        amount, 
        this.apiKey
      );
      
      const requestData = {
        merchantCode: this.merchantCode,
        paymentAmount: amount,
        paymentMethod: paymentData.paymentMethod,
        merchantOrderId: orderId,
        productDetails: paymentData.courseDescription || paymentData.courseName,
        customerVaName: paymentData.customerName,
        email: paymentData.customerEmail,
        phoneNumber: paymentData.customerPhone.replace(/\D/g, ''),
        itemDetails: [{
          name: paymentData.courseName,
          price: amount,
          quantity: 1
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
            'Accept': 'application/json'
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
        vaNumber: response.data.vaNumber,
        qrString: response.data.qrString,
        expiredDate: response.data.expiredDate,
        instructions: response.data.paymentInstructions
      };

    } catch (error) {
      logger.error('Duitku payment initiation error:', error);
      throw new Error(`Payment initiation failed: ${error.message}`);
    }
  }
}

module.exports = DuitkuService;