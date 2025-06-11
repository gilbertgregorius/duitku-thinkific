const logger = require('../utils/logger');
const redisConfig = require('../config/redis');
const apisConfig = require('../config/apis');

/**
 * Centralized webhook service for handling all webhook operations
 */
class WebhookService {
  constructor() {
    this.redis = redisConfig;
    this.config = apisConfig;
  }

  /**
   * Process Duitku payment callback
   */
  async processDuitkuCallback(webhookData) {
    try {
      const { 
        merchantOrderId, 
        amount, 
        resultCode, 
        merchantUserId,
        reference,
        signature 
      } = webhookData;

      logger.info('Processing Duitku webhook callback', {
        merchantOrderId,
        amount,
        resultCode,
        reference
      });

      // Store webhook data in Redis for processing
      const webhookKey = `webhook:duitku:${merchantOrderId}`;
      await this.redis.set(webhookKey, {
        ...webhookData,
        processed: false,
        receivedAt: new Date().toISOString()
      }, 3600); // 1 hour TTL

      // Determine payment status
      const paymentStatus = this.mapDuitkuStatus(resultCode);
      
      // Get order data from Redis
      const orderKey = `order:${merchantOrderId}`;
      const orderData = await this.redis.get(orderKey);

      if (!orderData) {
        logger.error('Order not found for Duitku callback', { merchantOrderId });
        throw new Error(`Order ${merchantOrderId} not found`);
      }

      // Update order status
      const updatedOrder = {
        ...orderData,
        status: paymentStatus,
        duitku_reference: reference,
        payment_completed_at: paymentStatus === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };

      await this.redis.set(orderKey, updatedOrder);

      // If payment successful, trigger enrollment
      if (paymentStatus === 'completed') {
        await this.triggerEnrollment(updatedOrder);
      }

      // Mark webhook as processed
      await this.redis.set(webhookKey, {
        ...webhookData,
        processed: true,
        processedAt: new Date().toISOString(),
        orderStatus: paymentStatus
      }, 3600);

      logger.info('Duitku webhook processed successfully', {
        merchantOrderId,
        status: paymentStatus
      });

      return {
        success: true,
        orderId: merchantOrderId,
        status: paymentStatus
      };

    } catch (error) {
      logger.error('Error processing Duitku webhook:', error);
      throw error;
    }
  }

  /**
   * Process Thinkific webhook
   */
  async processThinkificWebhook(webhookData, eventType) {
    try {
      logger.info('Processing Thinkific webhook', {
        eventType,
        data: webhookData
      });

      // Store webhook data
      const webhookKey = `webhook:thinkific:${Date.now()}`;
      await this.redis.set(webhookKey, {
        eventType,
        data: webhookData,
        processed: false,
        receivedAt: new Date().toISOString()
      }, 3600);

      let result = {};

      switch (eventType) {
        case 'user.created':
          result = await this.handleUserCreated(webhookData);
          break;
        case 'enrollment.created':
          result = await this.handleEnrollmentCreated(webhookData);
          break;
        case 'enrollment.updated':
          result = await this.handleEnrollmentUpdated(webhookData);
          break;
        case 'order.completed':
          result = await this.handleOrderCompleted(webhookData);
          break;
        case 'course.completed':
          result = await this.handleCourseCompleted(webhookData);
          break;
        default:
          logger.warn('Unhandled Thinkific webhook event', { eventType });
          result = { success: true, message: 'Event acknowledged but not processed' };
      }

      // Mark webhook as processed
      await this.redis.set(webhookKey, {
        eventType,
        data: webhookData,
        processed: true,
        processedAt: new Date().toISOString(),
        result
      }, 3600);

      return result;

    } catch (error) {
      logger.error('Error processing Thinkific webhook:', error);
      throw error;
    }
  }

  /**
   * Map Duitku result codes to our internal status
   */
  mapDuitkuStatus(resultCode) {
    const statusMap = {
      '00': 'completed',    // Success
      '01': 'pending',      // Pending
      '02': 'failed',       // Failed
      '03': 'cancelled',    // Cancelled
      '04': 'expired'       // Expired
    };

    return statusMap[resultCode] || 'unknown';
  }

  /**
   * Trigger enrollment after successful payment
   */
  async triggerEnrollment(orderData) {
    try {
      const { user_email, course_id, thinkific_course_id, customer_name } = orderData;

      logger.info('Triggering enrollment', {
        email: user_email,
        courseId: thinkific_course_id
      });

      // Create enrollment data
      const enrollmentData = {
        user_email,
        course_id: thinkific_course_id,
        customer_name,
        enrolled_at: new Date().toISOString(),
        status: 'active',
        source: 'duitku_payment'
      };

      // Store enrollment in Redis
      const enrollmentKey = `enrollment:${user_email}:${thinkific_course_id}`;
      await this.redis.set(enrollmentKey, enrollmentData);

      // Add to enrollment queue for processing
      await this.addToEnrollmentQueue(enrollmentData);

      return enrollmentData;

    } catch (error) {
      logger.error('Error triggering enrollment:', error);
      throw error;
    }
  }

  /**
   * Handle Thinkific user created event
   */
  async handleUserCreated(userData) {
    try {
      const { id, email, first_name, last_name } = userData;
      
      // Store user data
      const userKey = `thinkific_user:${email}`;
      await this.redis.set(userKey, {
        thinkific_id: id,
        email,
        first_name,
        last_name,
        created_at: new Date().toISOString()
      });

      logger.info('Thinkific user stored', { email, thinkific_id: id });
      
      return { success: true, message: 'User data stored' };
    } catch (error) {
      logger.error('Error handling user created:', error);
      throw error;
    }
  }

  /**
   * Handle Thinkific enrollment created event
   */
  async handleEnrollmentCreated(enrollmentData) {
    try {
      const { id, user_email, course_id, activated_at } = enrollmentData;
      
      // Update our enrollment record
      const enrollmentKey = `enrollment:${user_email}:${course_id}`;
      const existingEnrollment = await this.redis.get(enrollmentKey);
      
      if (existingEnrollment) {
        const updatedEnrollment = {
          ...existingEnrollment,
          thinkific_enrollment_id: id,
          thinkific_activated_at: activated_at,
          status: 'confirmed'
        };
        
        await this.redis.set(enrollmentKey, updatedEnrollment);
      }

      logger.info('Enrollment confirmed in Thinkific', { 
        user_email, 
        course_id, 
        enrollment_id: id 
      });

      return { success: true, message: 'Enrollment confirmed' };
    } catch (error) {
      logger.error('Error handling enrollment created:', error);
      throw error;
    }
  }

  /**
   * Handle Thinkific enrollment updated event
   */
  async handleEnrollmentUpdated(enrollmentData) {
    try {
      const { id, user_email, course_id, percentage_completed } = enrollmentData;
      
      // Update progress
      const enrollmentKey = `enrollment:${user_email}:${course_id}`;
      const existingEnrollment = await this.redis.get(enrollmentKey);
      
      if (existingEnrollment) {
        const updatedEnrollment = {
          ...existingEnrollment,
          progress_percentage: percentage_completed,
          updated_at: new Date().toISOString()
        };
        
        await this.redis.set(enrollmentKey, updatedEnrollment);
      }

      return { success: true, message: 'Enrollment progress updated' };
    } catch (error) {
      logger.error('Error handling enrollment updated:', error);
      throw error;
    }
  }

  /**
   * Handle Thinkific order completed event
   */
  async handleOrderCompleted(orderData) {
    try {
      const { id, user_email, total, status } = orderData;
      
      logger.info('Thinkific order completed', { 
        order_id: id, 
        user_email, 
        total, 
        status 
      });

      // Store Thinkific order data
      const orderKey = `thinkific_order:${id}`;
      await this.redis.set(orderKey, {
        ...orderData,
        received_at: new Date().toISOString()
      });

      return { success: true, message: 'Order data stored' };
    } catch (error) {
      logger.error('Error handling order completed:', error);
      throw error;
    }
  }

  /**
   * Handle course completion
   */
  async handleCourseCompleted(completionData) {
    try {
      const { user_email, course_id, completed_at } = completionData;
      
      // Update enrollment with completion
      const enrollmentKey = `enrollment:${user_email}:${course_id}`;
      const existingEnrollment = await this.redis.get(enrollmentKey);
      
      if (existingEnrollment) {
        const updatedEnrollment = {
          ...existingEnrollment,
          completed_at,
          progress_percentage: 100,
          status: 'completed'
        };
        
        await this.redis.set(enrollmentKey, updatedEnrollment);
      }

      logger.info('Course completion recorded', { user_email, course_id });

      return { success: true, message: 'Course completion recorded' };
    } catch (error) {
      logger.error('Error handling course completed:', error);
      throw error;
    }
  }

  /**
   * Add enrollment to processing queue
   */
  async addToEnrollmentQueue(enrollmentData) {
    try {
      const queueKey = 'queue:enrollments';
      const queueItem = {
        ...enrollmentData,
        queued_at: new Date().toISOString(),
        attempts: 0
      };

      // Add to Redis list (queue)
      const client = this.redis.getClient();
      await client.lPush(queueKey, JSON.stringify(queueItem));

      logger.info('Enrollment added to queue', { 
        email: enrollmentData.user_email,
        course_id: enrollmentData.course_id 
      });

    } catch (error) {
      logger.error('Error adding to enrollment queue:', error);
      throw error;
    }
  }

  /**
   * Get webhook processing status
   */
  async getWebhookStatus(webhookId, type = 'duitku') {
    try {
      const webhookKey = `webhook:${type}:${webhookId}`;
      return await this.redis.get(webhookKey);
    } catch (error) {
      logger.error('Error getting webhook status:', error);
      return null;
    }
  }

  /**
   * Retry failed webhook processing
   */
  async retryWebhook(webhookId, type = 'duitku') {
    try {
      const webhookData = await this.getWebhookStatus(webhookId, type);
      
      if (!webhookData) {
        throw new Error('Webhook data not found');
      }

      if (type === 'duitku') {
        return await this.processDuitkuCallback(webhookData.data || webhookData);
      } else if (type === 'thinkific') {
        return await this.processThinkificWebhook(webhookData.data, webhookData.eventType);
      }

    } catch (error) {
      logger.error('Error retrying webhook:', error);
      throw error;
    }
  }
}

module.exports = new WebhookService();
