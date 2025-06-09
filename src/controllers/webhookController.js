const logger = require('../utils/logger');
const DuitkuService = require('../services/duitkuService');
const ThinkificService = require('../services/thinkificServices');
const DataStore = require('../services/dataStore');
const EnrollmentController = require('./enrollmentController');
const config = require('../config');
const crypto = require('crypto');

const duitkuService = new DuitkuService(config.duitku);
const thinkificService = new ThinkificService(config.thinkific);
const dataStore = new DataStore();

class WebhookController {
  
  /**
   * Intelligent webhook source detection (from Pipedream pattern)
   */
  detectWebhookSource(webhookData) {
    const isDuitkuWebhook = webhookData.hasOwnProperty('merchantOrderId') || 
                           webhookData.hasOwnProperty('resultCode') ||
                           webhookData.hasOwnProperty('signature');
    
    const isThinkificWebhook = webhookData.hasOwnProperty('resource') && 
                              webhookData.hasOwnProperty('action') && 
                              webhookData.hasOwnProperty('payload');

    return { isDuitkuWebhook, isThinkificWebhook };
  }

  /**
   * Enhanced signature verification (from Pipedream pattern)
   */
  verifyDuitkuSignature(webhookData) {
    const {
      merchantOrderId,
      amount,
      signature: receivedSignature
    } = webhookData;

    if (!merchantOrderId || !amount || !receivedSignature) {
      return { valid: false, error: "Missing required fields for signature verification" };
    }

    if (!config.duitku.merchantCode || !config.duitku.apiKey) {
      return { valid: false, error: "Merchant code and API key are required for verification" };
    }

    // Create signature for verification
    const signatureString = `${config.duitku.merchantCode}${amount}${merchantOrderId}${config.duitku.apiKey}`;
    const calculatedSignature = crypto.createHash('md5')
      .update(signatureString)
      .digest('hex');

    const isValid = calculatedSignature.toLowerCase() === receivedSignature.toLowerCase();
    
    return { 
      valid: isValid, 
      calculatedSignature, 
      receivedSignature,
      error: isValid ? null : "Signature verification failed"
    };
  }

  /**
   * Enhanced payment status mapping (from Pipedream pattern)
   */
  mapPaymentStatus(resultCode) {
    const paymentStatuses = {
      "00": "SUCCESS",
      "01": "PENDING", 
      "02": "FAILED",
      "03": "CANCELLED"
    };

    const status = paymentStatuses[resultCode];
    return {
      status: status || "UNKNOWN",
      isKnown: !!status,
      code: resultCode
    };
  }

  /**
   * Enhanced duplicate detection (from Pipedream pattern)
   */
  async checkDuplicatePayment(merchantOrderId, reference = null) {
    const paymentKey = `duitku_payment_${merchantOrderId}_${reference || 'no_ref'}`;
    const existingPayment = await dataStore.get(paymentKey);
    
    return {
      isDuplicate: !!existingPayment,
      key: paymentKey,
      existing: existingPayment
    };
  }

  async handleDuitkuWebhook(req, res) {
    const startTime = Date.now();
    
    try {
      const webhookData = req.body;
      
      // Enhanced validation with detailed error messages
      const {
        merchantOrderId,
        amount,
        resultCode,
        merchantUserId,
        reference,
        signature: receivedSignature,
        spUserHash,
        settlementDate,
        issuerCode,
        paymentMethod
      } = webhookData;

      // Validate required fields
      if (!merchantOrderId || !amount || !resultCode || !receivedSignature) {
        logger.warn('Duitku webhook validation failed - missing required fields', {
          hasOrderId: !!merchantOrderId,
          hasAmount: !!amount,
          hasResultCode: !!resultCode,
          hasSignature: !!receivedSignature
        });
        return res.status(400).json({ 
          success: false,
          error: "Missing required Duitku webhook data fields",
          details: {
            merchantOrderId: !!merchantOrderId,
            amount: !!amount,
            resultCode: !!resultCode,
            signature: !!receivedSignature
          }
        });
      }

      // Enhanced signature verification
      const signatureCheck = this.verifyDuitkuSignature(webhookData);
      if (!signatureCheck.valid) {
        logger.warn('Duitku webhook signature verification failed', {
          orderId: merchantOrderId,
          error: signatureCheck.error,
          calculated: signatureCheck.calculatedSignature,
          received: signatureCheck.receivedSignature
        });
        return res.status(400).json({
          success: false,
          error: "Invalid Duitku payment signature - webhook verification failed",
          orderId: merchantOrderId
        });
      }

      // Enhanced payment status mapping
      const paymentStatusInfo = this.mapPaymentStatus(resultCode);
      
      if (!paymentStatusInfo.isKnown) {
        logger.error('Unknown Duitku payment result code', {
          orderId: merchantOrderId,
          resultCode,
          amount
        });
        return res.status(400).json({
          success: false,
          error: `Unknown payment result code: ${resultCode}`,
          orderId: merchantOrderId
        });
      }

      // Enhanced duplicate detection
      const duplicateCheck = await this.checkDuplicatePayment(merchantOrderId, reference);
      
      if (duplicateCheck.isDuplicate) {
        logger.info('Duplicate Duitku payment notification detected', {
          orderId: merchantOrderId,
          reference,
          previouslyProcessed: duplicateCheck.existing
        });
        return res.json({
          success: true,
          status: "duplicate",
          orderId: merchantOrderId,
          paymentStatus: paymentStatusInfo.status,
          previouslyProcessed: duplicateCheck.existing,
          source: "duitku"
        });
      }

      // Create comprehensive payment record (Pipedream pattern)
      const paymentRecord = {
        orderId: merchantOrderId,
        amount: parseFloat(amount),
        status: paymentStatusInfo.status,
        resultCode,
        merchantUserId,
        reference,
        paymentMethod,
        issuerCode,
        settlementDate,
        spUserHash,
        processedAt: new Date().toISOString(),
        verified: true,
        source: "duitku",
        processingTime: Date.now() - startTime
      };

      // Store payment record first
      await dataStore.set(duplicateCheck.key, paymentRecord);

      // Update payment in database
      await dataStore.updatePayment(merchantOrderId, {
        status: paymentStatusInfo.status.toLowerCase(),
        duitku_reference: reference,
        payment_method: paymentMethod,
        issuer_code: issuerCode,
        settlement_date: settlementDate ? new Date(settlementDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')) : null,
        paid_at: paymentStatusInfo.status === 'SUCCESS' ? new Date() : null,
        webhook_processed_at: new Date()
      });

      // Enhanced enrollment processing for successful payments
      if (paymentStatusInfo.status === 'SUCCESS') {
        logger.info('Processing successful payment for enrollment', {
          orderId: merchantOrderId,
          amount: parseFloat(amount),
          reference
        });
        
        try {
          const enrollmentResult = await this.processSuccessfulPayment(merchantOrderId, paymentRecord);
          logger.info('Enrollment completed successfully', {
            orderId: merchantOrderId,
            enrollmentResult
          });
        } catch (enrollmentError) {
          logger.error('Enrollment processing failed but payment recorded', {
            orderId: merchantOrderId,
            error: enrollmentError.message,
            stack: enrollmentError.stack,
            paymentRecord
          });
          
          // Add to retry queue with exponential backoff
          await dataStore.addToQueue('enrollment_retry', {
            orderId: merchantOrderId,
            paymentRecord,
            error: enrollmentError.message,
            retryCount: 0,
            nextRetryAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
          });
        }
      }

      logger.info('Duitku webhook processed successfully', {
        orderId: merchantOrderId,
        status: paymentStatusInfo.status,
        amount: parseFloat(amount),
        reference,
        processingTime: Date.now() - startTime
      });
      
      // Structured response (Pipedream pattern)
      res.json({
        success: true,
        source: "duitku",
        verified: true,
        paymentStatus: paymentStatusInfo.status,
        orderId: merchantOrderId,
        amount: parseFloat(amount),
        merchantUserId,
        reference,
        paymentMethod,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Duitku webhook processing error', {
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime,
        webhookData: {
          merchantOrderId,
          amount,
          resultCode,
          reference
        }
      });
      
      res.status(500).json({ 
        success: false,
        error: 'Webhook processing failed',
        source: "duitku",
        timestamp: new Date().toISOString()
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
        courseName: payment.course_name,
        courseDescription: payment.course_description,
        coursePrice: payment.amount,
        orderId: merchantOrderId,
        reconstructed: true
      };
    }
    
    if (customerData) {
      // Process enrollment with enhanced data
      const enrollmentResult = await EnrollmentController.processEnrollment(payment, {
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
          courseName: enrollmentResult.extractedData?.course?.name,
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

  /**
   * Universal webhook handler (Pipedream-style auto-detection)
   */
  async handleUniversalWebhook(req, res) {
    try {
      const webhookData = req.body;
      const { isDuitkuWebhook, isThinkificWebhook } = this.detectWebhookSource(webhookData);
      
      if (isDuitkuWebhook) {
        logger.info('Auto-detected Duitku webhook, routing to Duitku handler');
        return await this.handleDuitkuWebhook(req, res);
      } else if (isThinkificWebhook) {
        logger.info('Auto-detected Thinkific webhook, routing to Thinkific handler');
        return await this.handleThinkificWebhook(req, res);
      } else {
        logger.warn('Unknown webhook source', {
          hasOrderId: !!webhookData.merchantOrderId,
          hasResource: !!webhookData.resource,
          hasAction: !!webhookData.action,
          keys: Object.keys(webhookData)
        });
        
        return res.status(400).json({
          success: false,
          error: "Unknown webhook source",
          detectedFields: Object.keys(webhookData),
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Universal webhook handler error', error);
      res.status(500).json({
        success: false,
        error: 'Universal webhook processing failed',
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new WebhookController();