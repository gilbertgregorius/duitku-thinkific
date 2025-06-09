const logger = require('../utils/logger');
const DuitkuService = require('../services/duitkuService');
const ThinkificService = require('../services/thinkificService');
const DataStore = require('../services/dataStore');
const config = require('../config');

const duitkuService = new DuitkuService(config.duitku);
const thinkificService = new ThinkificService(config.thinkific);
const dataStore = new DataStore();

class WebhookController {
  async handleDuitkuWebhook(req, res) {
    try {
      const webhookData = req.body;
      
      // Verify signature
      if (!duitkuService.verifyWebhookSignature(webhookData)) {
        logger.warn('Invalid Duitku webhook signature');
        return res.status(400).json({ error: 'Invalid signature' });
      }

      const {
        merchantOrderId,
        amount,
        resultCode,
        reference,
        paymentMethod
      } = webhookData;

      // Map payment status
      const paymentStatuses = {
        "00": "SUCCESS",
        "01": "PENDING", 
        "02": "FAILED",
        "03": "CANCELLED"
      };

      const paymentStatus = paymentStatuses[resultCode] || "UNKNOWN";

      // Check for duplicates
      const paymentKey = `duitku_payment_${merchantOrderId}`;
      const existingPayment = await dataStore.get(paymentKey);
      
      if (existingPayment) {
        logger.info(`Duplicate Duitku payment notification: ${merchantOrderId}`);
        return res.json({ status: 'duplicate', processed: true });
      }

      // Update payment in database
      await dataStore.updatePayment(merchantOrderId, {
        status: paymentStatus.toLowerCase(),
        duitku_reference: reference,
        payment_method: paymentMethod,
        paid_at: paymentStatus === 'SUCCESS' ? new Date() : null
      });

      // If payment successful, trigger enrollment
      if (paymentStatus === 'SUCCESS') {
        // Add to enrollment queue
        await dataStore.addToQueue('enrollment', {
          orderId: merchantOrderId,
          amount: parseFloat(amount),
          reference
        });
      }

      // Store webhook record
      await dataStore.set(paymentKey, {
        orderId: merchantOrderId,
        status: paymentStatus,
        amount: parseFloat(amount),
        processedAt: new Date().toISOString()
      });

      logger.info(`Processed Duitku ${paymentStatus} payment: ${merchantOrderId}`);
      
      res.json({ 
        status: 'success', 
        orderId: merchantOrderId,
        paymentStatus: paymentStatus.toLowerCase()
      });

    } catch (error) {
      logger.error('Duitku webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  async handleThinkificWebhook(req, res) {
    try {
      const webhookData = req.body;
      const { resource, action, payload } = webhookData;

      if (resource === 'enrollment' && action === 'created') {
        const enrollment = payload.enrollment || {};
        const user = payload.user || {};
        const course = payload.course || {};

        // Check for duplicates
        const enrollmentKey = `thinkific_enrollment_${enrollment.id}`;
        const existingRecord = await dataStore.get(enrollmentKey);
        
        if (existingRecord) {
          logger.info(`Duplicate Thinkific enrollment: ${enrollment.id}`);
          return res.json({ status: 'duplicate', processed: true });
        }

        // Store enrollment record
        const enrollmentRecord = {
          enrollmentId: enrollment.id,
          userId: user.id,
          userEmail: user.email,
          userName: `${user.first_name} ${user.last_name}`,
          courseId: course.id,
          courseName: course.name,
          activatedAt: enrollment.activated_at,
          processedAt: new Date().toISOString()
        };

        await dataStore.set(enrollmentKey, enrollmentRecord);
        await dataStore.saveEnrollment(enrollmentRecord);

        logger.info(`Processed Thinkific enrollment: ${user.email} -> ${course.name}`);
        
        res.json({ 
          status: 'success', 
          enrollment: enrollmentRecord 
        });

      } else {
        logger.info(`Unhandled Thinkific webhook: ${resource}.${action}`);
        res.json({ status: 'unhandled', resource, action });
      }

    } catch (error) {
      logger.error('Thinkific webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
}

module.exports = new WebhookController();