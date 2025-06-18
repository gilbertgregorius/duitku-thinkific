const Payment = require('../models/Payment');
const User = require('../models/User');

const logger = require('../utils/logger.js');
const config = require('../config/index.js');

const duitku = require('../services/duitku.js');
const dataStore = require('../services/dataStore.js');
const thinkific = require('../services/thinkific.js');


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
   * Enhanced payment validation (from Pipedream approach)
   */
  validatePaymentRequest(paymentData) {
    const required = ['productId', 'amount', 'customerName', 'customerEmail', 'paymentMethod'];
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
    if (paymentData.amount <= 0) {
      return {
        valid: false,
        error: 'Amount must be greater than 0',
        field: 'amount'
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
          name: paymentData.productName,
          price: paymentData.amount,
          quantity: 1
        }]
      };
      
      // Initiate payment with Duitku
      const result = await duitku.initiatePayment(enhancedPaymentData);
      
      // Enhanced payment record (following Pipedream comprehensive approach)
      const paymentRecord = {
        order_id: result.orderId || customOrderId,
        payment_url: result.paymentUrl,
        product_name: paymentData.productName,
        product_description: paymentData.productDescription,
        amount: paymentData.amount,
        payment_method: paymentData.paymentMethod,
        status: 'pending',
        duitku_reference: result.reference,
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
        productName: paymentData.productName,
        productDescription: paymentData.productDescription,
        amount: paymentData.amount,
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
        productName: paymentData.productName,
        amount: paymentData.amount,
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
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        product: {
          name: paymentData.productName,
          description: paymentData.productDescription,
          price: paymentData.amount
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
          productName: payment.product_name,
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

  // New method to handle Thinkific payment notifications
  async thinkificPaymentNotification(req, res) {
    try {
      const notificationData = req.body;

      logger.info('Thinkific payment notification received', { notificationData });

      // Validate notification data
      if (!notificationData.order_id || !notificationData.status) {
        return res.status(400).json({
          success: false,
          error: 'Invalid notification data'
        });
      }

      // Find the corresponding payment record
      const payment = await dataStore.getPayment(notificationData.order_id);

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found'
        });
      }

      // Update payment status based on Thinkific notification
      payment.status = notificationData.status;

      await dataStore.savePayment(payment);

      logger.info('Payment status updated from Thinkific notification', {
        orderId: payment.order_id,
        newStatus: payment.status
      });

      res.json({
        success: true,
        message: 'Payment status updated'
      });

    } catch (error) {
      logger.error('Thinkific payment notification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process Thinkific payment notification'
      });
    }
  }

  // New method to create or update user in Thinkific
  async upsertUserInThinkific(req, res) {
    try {
      const { email, firstName, lastName, phone } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required'
        });
      }

      // Check if user already exists in Thinkific
      let user = await User.findOne({ email });

      if (user) {
        // Update existing user
        user.firstName = firstName;
        user.lastName = lastName;
        user.phone = phone;
      } else {
        // Create new user
        user = new User({
          email,
          firstName,
          lastName,
          phone
        });
      }

      await user.save();

      logger.info('User upserted in Thinkific', {
        email,
        firstName,
        lastName,
        phone
      });

      res.json({
        success: true,
        message: 'User upserted successfully'
      });

    } catch (error) {
      logger.error('Upsert user in Thinkific error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upsert user in Thinkific'
      });
    }
  }

  // New method to handle Thinkific course enrollment
  async enrollUserInCourse(req, res) {
    try {
      const { email, courseId } = req.body;

      if (!email || !courseId) {
        return res.status(400).json({
          success: false,
          error: 'Email and Course ID are required'
        });
      }

      // Find the user by email
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Enroll the user in the course
      const enrollment = await thinkific.enrollUserInCourse(user.thinkificId, courseId);

      if (!enrollment) {
        return res.status(500).json({
          success: false,
          error: 'Failed to enroll user in course'
        });
      }

      logger.info('User enrolled in course', {
        email,
        courseId
      });

      res.json({
        success: true,
        message: 'User enrolled in course successfully'
      });

    } catch (error) {
      logger.error('Enroll user in course error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to enroll user in course'
      });
    }
  }

  // New methods from newController.js for Thinkific integration
  async showCheckout(req, res) {
    try {
      const { productId, subdomain } = req.query;
      
      // Get product details from Thinkific
      const user = await User.findOne({ where: { subdomain } });
      if (!user) {
        return res.status(404).render('error', { error: 'User not found' });
      }
      
      const product = await thinkific.getProduct(user.accessToken, productId);
      
      // Get primary price for the product
      const primaryPrice = product.product_prices?.find(p => p.is_primary);
      const amount = primaryPrice ? parseFloat(primaryPrice.price) : parseFloat(product.price) || 0;
      
      res.render('payment/checkout', {
        product,
        amount,
        subdomain,
        userId: user.id
      });
    } catch (error) {
      logger.error('Checkout page error:', error);
      res.status(500).render('error', { error: 'Failed to load checkout page' });
    }
  }

  async createPayment(req, res) {
    try {
      const { productId, amount, customerEmail, customerName } = req.body;
      const { subdomain } = req.query;
      
      const user = await User.findOne({ where: { subdomain } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Try to get or create user in Thinkific first
      let thinkificUserId;
      try {
        // Since /users/me might not work due to OAuth scopes,
        // try to create the user first (will return existing if already exists)
        const thinkificUser = await thinkific.createUser(user.accessToken, {
          email: customerEmail,
          firstName: customerName ? customerName.split(' ')[0] : 'Customer',
          lastName: customerName ? customerName.split(' ').slice(1).join(' ') : 'User'
        });
        
        thinkificUserId = thinkificUser.id;
        logger.info('Thinkific user resolved:', { id: thinkificUserId, email: customerEmail });
        
      } catch (error) {
        logger.error('Failed to create/get Thinkific user:', error.message);
        return res.status(500).json({ error: 'Failed to create user in Thinkific' });
      }
      
      // Create external order in Thinkific using the provided productId
      const thinkificOrder = await thinkific.createExternalOrder({
        accessToken: user.accessToken,
        productId: productId,
        amount,
        orderId,
        userId: thinkificUserId, // Use the Thinkific user ID
        userEmail: customerEmail
      });
      
      // Create payment in Duitku
      const duitkuPayment = await duitku.initiatePayment({
        orderId,
        amount,
        customerEmail: customerEmail,
        customerName: customerName,
      });
      
      // Save payment record
      const payment = await Payment.create({
        orderId,
        userId: user.id,
        productId, // Changed from courseId to productId
        amount,
        paymentUrl: duitkuPayment.paymentUrl,
        duitkuReference: duitkuPayment.reference,
        thinkificOrderId: thinkificOrder.id
      });
      
      res.json({ 
        success: true, 
        paymentUrl: duitkuPayment.paymentUrl,
        orderId 
      });
    } catch (error) {
      logger.error('Payment creation failed:', error.message);
      res.status(500).json({ error: 'Payment creation failed' });
    }
  }

  async showSuccess(req, res) {
    try {
      const { orderId } = req.query;
      const payment = await Payment.findOne({ 
        where: { orderId },
        include: [{ model: User, as: 'user' }]
      });
      
      if (!payment) {
        return res.status(404).render('error', { error: 'Payment not found' });
      }

      res.render('payment/success', {
        orderId: payment.orderId,
        amount: payment.amount,
        productName: payment.product_name || 'Product',
        backUrl: `https://${payment.user?.subdomain}.thinkific.com`
      });
    } catch (error) {
      logger.error('Success page error:', error);
      res.status(500).render('error', { error: 'Failed to load success page' });
    }
  }

  async showFailure(req, res) {
    try {
      const { orderId } = req.query;
      res.render('payment/failure', { orderId });
    } catch (error) {
      logger.error('Failure page error:', error);
      res.status(500).render('error', { error: 'Failed to load failure page' });
    }
  }
}

module.exports = new PaymentController();