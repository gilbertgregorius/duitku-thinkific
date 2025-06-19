const logger = require('../utils/logger');
const enrollCtrl = require('./enrollmentController');
const crypto = require('crypto');
const config = require('../config');

const dataStore = require('../services/dataStore');

class WebhookController {
  verifySignature(callbackData) {
    const { merchantCode, amount, merchantOrderId, signature } = callbackData;
    const merchantKey = config.duitkuConfig.merchantKey;
    
    const signatureString = `${merchantCode}${amount}${merchantOrderId}${merchantKey}`;
    const calculatedSignature = crypto.createHash('md5').update(signatureString).digest('hex');
    
    return calculatedSignature.toLowerCase() === signature.toLowerCase();
  }

  async handleDuitkuCallback(req, res) {
    try {
      const { 
        merchantCode,
        amount,
        merchantOrderId,
        additionalParam,
        resultCode,
        reference,
        signature 
      } = req.body;

      logger.info('Payment callback received', {
        merchantOrderId,
        resultCode,
        amount,
        hasAdditionalParam: !!additionalParam,
        additionalParamContent: additionalParam,
        fullRequestBody: req.body
      });

      const isValidSignature = this.verifySignature({
        merchantCode,
        amount,
        merchantOrderId,
        signature
      });

      if (!isValidSignature) {
        logger.warn('Invalid payment callback signature');
        return res.status(400).json({
          success: false,
          error: 'Invalid signature',
        });
      }

      if (resultCode !== '00') {
        logger.info('Payment not successful', { resultCode, merchantOrderId });
        return res.json({ success: true, message: 'Payment status recorded' });
      }

      let enrollmentData;
      try {
        enrollmentData = JSON.parse(additionalParam || '{}');
      } catch (error) {
        logger.error('Failed to parse additionalParam', { additionalParam, error: error.message });
        return res.status(400).json({ success: false, error: 'Invalid additionalParam' });
      }

      const { customerEmail, productId } = enrollmentData;

      // If additionalParam is empty (common with Duitku), try to get data from database
      if (!customerEmail || !productId) {
        logger.info('AdditionalParam empty, attempting to retrieve enrollment data from database', { merchantOrderId });
        
        try {
          // Try to get payment data from database using merchantOrderId
          const paymentRecord = await dataStore.getPaymentByOrderId(merchantOrderId);
          
          if (paymentRecord) {
            logger.info('Retrieved payment data from database', {
              merchantOrderId,
              customerEmail: paymentRecord.customer_email,
              paymentId: paymentRecord.id
            });
            
            // Use data from database
            const dbCustomerEmail = paymentRecord.customer_email;
            const dbProductId = paymentRecord.product_id || paymentRecord.additional_data?.productId;
            
            if (dbCustomerEmail && dbProductId) {
              // Process successful payment with database data
              logger.info('Payment processed successfully from database', {
                merchantOrderId,
                customerEmail: dbCustomerEmail,
                productId: dbProductId
              });
              
              return res.json({ 
                success: true, 
                message: 'Payment processed successfully',
                receivedData: {
                  merchantOrderId,
                  amount,
                  resultCode,
                  reference,
                  customerEmail: dbCustomerEmail,
                  productId: dbProductId,
                  source: 'database'
                }
              });
            }
          }
        } catch (dbError) {
          logger.error('Error retrieving payment data from database', { merchantOrderId, error: dbError.message });
        }
        
        logger.error('Missing enrollment data in callback and unable to retrieve from database', { 
          merchantOrderId,
          customerEmail, 
          productId,
          hasAdditionalParam: !!additionalParam,
          additionalParamContent: additionalParam
        });
        return res.status(400).json({ success: false, error: 'Missing enrollment data' });
      }

      // const externalOrderId = await thinkific.createExternalOrder({
      //   customerEmail,
      //   productId,
      //   amount: parseInt(amount),
      //   reference
      // });
      
      //TODO: Subscription purchases
      // Use POST /external_orders to create the subscription,
      // then use the ` POST /external_orders/.../purchase
      // whenever you process a transaction related to the subscription.
      // You should also use the refund endpoint to keep our records consistent with the external platform.

      logger.info('Payment processed successfully', {
        merchantOrderId,
        customerEmail,
        productId
      });
      
      res.json({ 
        success: true, 
        message: 'Payment processed successfully',
        receivedData: {
          merchantOrderId,
          amount,
          resultCode,
          reference,
          customerEmail,
          productId,
          additionalParam
        }
      });

    } catch (error) {
      logger.error('Payment callback error:', error);
      return res.status(500).json({
        success: false,
        error: 'Payment callback processing failed',
        message: error.message
      });
    }
  }

  /**
   * Process successful payment and trigger enrollment (Enhanced from Pipedream)
   */
  async processSuccessfulPayment(merchantOrderId, paymentRecord) {
    // Get payment details from database
    const payment = await dataStore.getPaymentByOrderId(merchantOrderId);
    if (!payment) {
      throw new Error(`Payment record not found for order ${merchantOrderId}`);
    }

    // Get customer data stored during payment initiation
    const customerDataKey = `customer_${merchantOrderId}`;
    let customerData = await dataStore.get(customerDataKey);
    
    // If no customer data in cache, try to reconstruct from payment record
    if (!customerData && payment) {
      logger.warn('Customer data not found in cache, reconstructing from payment record', {
        orderId: merchantOrderId,
        paymentId: payment.id
      });
      
      customerData = {
        customerName: payment.customer_name,
        customerEmail: payment.customer_email,
        customerPhone: payment.customer_phone,
        productName: payment.product_name,
        productDescription: payment.product_description,
        amount: payment.amount,
        orderId: merchantOrderId,
        reconstructed: true
      };
    }
    
    if (customerData) {
      // Process enrollment with enhanced data
      const enrollmentResult = await enrollCtrl.processEnrollment(payment, {
        ...customerData,
        paymentRecord
      });
      
      logger.info('Enrollment triggered successfully', {
        orderId: merchantOrderId,
        result: enrollmentResult,
        wasReconstructed: customerData.reconstructed || false
      });
      
      return enrollmentResult;
    } else {
      // Enhanced fallback: Add detailed info to manual processing queue
      await dataStore.addToQueue('manual_enrollment', {
        orderId: merchantOrderId,
        paymentRecord,
        payment: payment,
        amount: paymentRecord.amount,
        reference: paymentRecord.reference,
        needsManualProcessing: true,
        reason: 'Customer data not found in cache and payment record incomplete',
        createdAt: new Date().toISOString()
      });
      
      logger.error('Customer data not found and cannot be reconstructed', {
        orderId: merchantOrderId,
        paymentAmount: paymentRecord.amount,
        paymentRecord: payment
      });
      
      throw new Error(`Customer data not found for ${merchantOrderId}, added to manual processing queue`);
    }
  }

  /**
   * Enhanced Thinkific webhook handler (Based on Pipedream patterns)
   */
  async handleThinkificWebhook(req, res) {
    const startTime = Date.now();
    
    try {
      const webhookData = req.body;
      const { resource, action, payload, created_at, id } = webhookData;
      
      // Enhanced event type detection
      const eventType = resource && action ? `${resource}.${action}` : null;
      
      logger.info('Processing Thinkific webhook', {
        eventType,
        resource,
        action,
        webhookId: id,
        timestamp: created_at
      });

      // Initialize structured response
      const response = {
        success: true,
        source: "thinkific",
        eventType,
        resource,
        action,
        processed: false,
        extractedData: null,
        processingTime: 0
      };

      // Handle enrollment.created events with enhanced extraction
      if (eventType === "enrollment.created") {
        const enrollmentResult = await this.processThinkificEnrollment(payload, id, created_at);
        
        response.processed = true;
        response.extractedData = enrollmentResult.extractedData;
        response.status = enrollmentResult.status;
        
        logger.info('Thinkific enrollment processed', {
          enrollmentId: enrollmentResult.extractedData?.enrollment?.id,
          userEmail: enrollmentResult.extractedData?.user?.email,
          productName: enrollmentResult.extractedData?.product?.name,
          processingTime: Date.now() - startTime
        });

      } else {
        // Handle other webhook types with structured logging
        logger.info(`Unhandled Thinkific webhook: ${eventType}`, {
          resource,
          action,
          payload: payload ? Object.keys(payload) : []
        });
        
        response.status = "unhandled";
        response.extractedData = payload || webhookData;
      }

      response.processingTime = Date.now() - startTime;
      response.timestamp = new Date().toISOString();
      
      res.json(response);

    } catch (error) {
      logger.error('Thinkific webhook processing error', {
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      
      res.status(500).json({ 
        success: false,
        error: 'Thinkific webhook processing failed',
        source: "thinkific",
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Process Thinkific enrollment with enhanced data extraction (Pipedream pattern)
   */
  async processThinkificEnrollment(payload, webhookId, webhookTimestamp) {
    const enrollment = payload.enrollment || {};
    const user = payload.user || {};
    const course = payload.course || {};
    
    // Enhanced duplicate detection
    const enrollmentKey = `thinkific_enrollment_${enrollment.id}`;
    const existingRecord = await dataStore.get(enrollmentKey);
    
    if (existingRecord) {
      logger.info('Duplicate Thinkific enrollment detected', {
        enrollmentId: enrollment.id,
        userEmail: user.email,
        previouslyProcessed: existingRecord
      });
      
      return {
        status: "duplicate",
        extractedData: existingRecord
      };
    }

    // Enhanced data extraction (Following Pipedream structure)
    const extractedData = {
      enrollment: {
        id: enrollment.id,
        status: enrollment.status,
        percentage_completed: enrollment.percentage_completed || 0,
        created_at: enrollment.created_at,
        updated_at: enrollment.updated_at,
        started_at: enrollment.started_at,
        completed_at: enrollment.completed_at,
        expiry_date: enrollment.expiry_date,
        activated_at: enrollment.activated_at
      },
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        full_name: user.full_name || `${user.first_name} ${user.last_name}`,
        created_at: user.created_at
      },
      course: {
        id: course.id,
        name: course.name,
        slug: course.slug,
        description: course.description,
        card_image_url: course.card_image_url,
        position: course.position,
        user_id: course.user_id
      },
      webhook: {
        id: webhookId,
        timestamp: webhookTimestamp,
        processed_at: new Date().toISOString()
      }
    };

    // Store comprehensive enrollment record
    const enrollmentRecord = {
      enrollmentId: enrollment.id,
      userId: user.id,
      userEmail: user.email,
      userName: extractedData.user.full_name,
      courseId: course.id,
      courseName: course.name,
      activatedAt: enrollment.activated_at,
      createdAt: enrollment.created_at,
      webhookId: webhookId,
      webhookTimestamp: webhookTimestamp,
      processedAt: new Date().toISOString(),
      source: "thinkific",
      extractedData
    };

    // Store both in Redis and database
    await dataStore.set(enrollmentKey, enrollmentRecord);
    await dataStore.saveEnrollment(enrollmentRecord);

    return {
      status: "success",
      extractedData: extractedData
    };
  }

}
 
module.exports = new WebhookController(); 