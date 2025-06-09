const logger = require('../utils/logger.js');
const DuitkuService = require('../services/duitkuService.js');
const DataStore = require('../services/dataStore.js');
const config = require('../config/index.js');

const duitkuService = new DuitkuService(config.duitku);
const dataStore = new DataStore();

class PaymentController {
  
  /**
   * Enhanced order ID generation (from Pipedream pattern)
   */
  generateEnhancedOrderId(customerEmail = null) {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9).toUpperCase();
    const userPrefix = customerEmail ? customerEmail.split('@')[0].substr(0, 3).toUpperCase() : 'USR';
    return `COURSE_${userPrefix}_${timestamp}_${randomStr}`;
  }

  /**
   * Enhanced payment validation (from Pipedream approach)
   */
  validatePaymentRequest(paymentData) {
    const required = ['courseName', 'coursePrice', 'customerName', 'customerEmail', 'paymentMethod'];
    const missing = required.filter(field => !paymentData[field]);
    
    if (missing.length > 0) {
      return {
        valid: false,
        error: `Missing required fields: ${missing.join(', ')}`,
        missing
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(paymentData.customerEmail)) {
      return {
        valid: false,
        error: 'Invalid email format',
        field: 'customerEmail'
      };
    }

    // Validate amount
    if (paymentData.coursePrice <= 0) {
      return {
        valid: false,
        error: 'Course price must be greater than 0',
        field: 'coursePrice'
      };
    }

    return { valid: true };
  }

  async initiatePayment(req, res) {
    const startTime = Date.now();
    
    try {
      const paymentData = req.body;
      
      // Enhanced validation
      const validation = this.validatePaymentRequest(paymentData);
      if (!validation.valid) {
        logger.warn('Payment initiation validation failed', {
          error: validation.error,
          missing: validation.missing,
          field: validation.field,
          customerEmail: paymentData.customerEmail
        });
        
        return res.status(400).json({
          success: false,
          error: validation.error,
          details: validation,
          timestamp: new Date().toISOString()
        });
      }

      // Enhanced order ID generation
      const customOrderId = this.generateEnhancedOrderId(paymentData.customerEmail);
      
      // Prepare enhanced payment data (following Pipedream structure)
      const enhancedPaymentData = {
        ...paymentData,
        orderId: customOrderId,
        customerDetail: {
          firstName: paymentData.customerName.split(' ')[0],
          lastName: paymentData.customerName.split(' ').slice(1).join(' ') || '',
          email: paymentData.customerEmail,
          phoneNumber: paymentData.customerPhone?.replace(/\D/g, '') || ''
        },
        itemDetails: [{
          name: paymentData.courseName,
          price: paymentData.coursePrice,
          quantity: 1
        }]
      };
      
      // Initiate payment with Duitku
      const result = await duitkuService.initiatePayment(enhancedPaymentData);
      
      // Enhanced payment record (following Pipedream comprehensive approach)
      const paymentRecord = {
        order_id: result.orderId || customOrderId,
        course_name: paymentData.courseName,
        course_description: paymentData.courseDescription,
        amount: paymentData.coursePrice,
        payment_method: paymentData.paymentMethod,
        status: 'pending',
        duitku_reference: result.reference,
        payment_url: result.paymentUrl,
        va_number: result.vaNumber,
        qr_string: result.qrString,
        expires_at: result.expiredDate ? new Date(result.expiredDate) : null,
        customer_name: paymentData.customerName,
        customer_email: paymentData.customerEmail,
        customer_phone: paymentData.customerPhone,
        created_at: new Date(),
        environment: config.duitku.environment,
        processing_time: Date.now() - startTime
      };

      await dataStore.savePayment(paymentRecord);
      
      // Enhanced customer data storage (following Pipedream pattern)
      const customerDataKey = `customer_${result.orderId || customOrderId}`;
      const comprehensiveCustomerData = {
        customerName: paymentData.customerName,
        customerEmail: paymentData.customerEmail,
        customerPhone: paymentData.customerPhone,
        courseName: paymentData.courseName,
        courseDescription: paymentData.courseDescription,
        coursePrice: paymentData.coursePrice,
        paymentMethod: paymentData.paymentMethod,
        orderId: result.orderId || customOrderId,
        initiatedAt: new Date().toISOString(),
        userAgent: req.get('User-Agent'),
        ip: req.ip
      };
      
      await dataStore.set(customerDataKey, comprehensiveCustomerData, 24 * 60 * 60); // 24 hours

      logger.info('Payment initiated successfully', {
        orderId: result.orderId || customOrderId,
        customerEmail: paymentData.customerEmail,
        courseName: paymentData.courseName,
        amount: paymentData.coursePrice,
        paymentMethod: paymentData.paymentMethod,
        processingTime: Date.now() - startTime
      });

      // Enhanced response (following Pipedream structure)
      const paymentResponse = {
        success: true,
        orderId: result.orderId || customOrderId,
        reference: result.reference,
        paymentUrl: result.paymentUrl,
        vaNumber: result.vaNumber,
        qrString: result.qrString,
        amount: paymentData.coursePrice,
        paymentMethod: paymentData.paymentMethod,
        course: {
          name: paymentData.courseName,
          description: paymentData.courseDescription,
          price: paymentData.coursePrice
        },
        customer: {
          name: paymentData.customerName,
          email: paymentData.customerEmail,
          phone: paymentData.customerPhone
        },
        expiredDate: result.expiredDate,
        expiresAt: result.expiredDate,
        status: "pending",
        instructions: result.instructions || result.paymentInstructions,
        environment: config.duitku.environment,
        processingTime: Date.now() - startTime,
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString()
      };

      res.json(paymentResponse);

    } catch (error) {
      logger.error('Payment initiation error:', error);
      res.status(500).json({
        success: false,
        error: 'Payment initiation failed',
        message: error.message
      });
    }
  }

  async getPaymentStatus(req, res) {
    try {
      const { orderId } = req.params;
      
      const payment = await dataStore.getPayment(orderId);
      
      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found'
        });
      }

      res.json({
        success: true,
        payment: {
          orderId: payment.order_id,
          status: payment.status,
          amount: payment.amount,
          courseName: payment.course_name,
          customerName: payment.user_name,
          customerEmail: payment.user_email,
          paymentMethod: payment.payment_method,
          createdAt: payment.created_at,
          paidAt: payment.paid_at,
          expiresAt: payment.expires_at
        }
      });

    } catch (error) {
      logger.error('Get payment status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get payment status'
      });
    }
  }
}

module.exports = new PaymentController();