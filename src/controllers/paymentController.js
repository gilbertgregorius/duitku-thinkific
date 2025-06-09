const logger = require('../utils/logger.js');
const DuitkuService = require('../services/duitkuService.js');
const DataStore = require('../services/dataStore.js');
const config = require('../config/index.js');

const duitkuService = new DuitkuService(config.duitku);
const dataStore = new DataStore();

class PaymentController {
  async initiatePayment(req, res) {
    try {
      const paymentData = req.body;
      
      // Initiate payment with Duitku
      const result = await duitkuService.initiatePayment(paymentData);
      
      // Save payment record to database
      const paymentRecord = {
        order_id: result.orderId,
        user_email: paymentData.customerEmail,
        user_name: paymentData.customerName,
        user_phone: paymentData.customerPhone,
        course_name: paymentData.courseName,
        course_description: paymentData.courseDescription,
        amount: paymentData.amount,
        payment_method: paymentData.paymentMethod,
        payment_url: result.paymentUrl,
        va_number: result.vaNumber,
        duitku_reference: result.reference,
        expires_at: result.expiredDate,
        status: 'pending',
        created_at: new Date()
      };

      await dataStore.savePayment(paymentRecord);

      logger.info(`Payment initiated: ${result.orderId} for ${paymentData.customerEmail}`);

      res.json({
        success: true,
        orderId: result.orderId,
        paymentUrl: result.paymentUrl,
        vaNumber: result.vaNumber,
        instructions: result.instructions,
        expiresAt: result.expiredDate
      });

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