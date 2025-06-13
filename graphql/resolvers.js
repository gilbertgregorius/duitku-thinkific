const Payment = require('../src/models/Payment');
const User = require('../src/models/User');
const DuitkuService = require('../src/services/duitkuService');
const ThinkificService = require('../src/services/thinkificServices');
const logger = require('../src/utils/logger');
const config = require('../src/config');

// Initialize services
const duitkuService = new DuitkuService(config.duitkuConfig);
const thinkificService = new ThinkificService(config.thinkificConfig);

const resolvers = {
  Query: {
    user: async (_, { subdomain }) => {
      try {
        return await User.findOne({ where: { subdomain } });
      } catch (error) {
        logger.error('Error fetching user:', error);
        throw new Error('Failed to fetch user');
      }
    },

    payment: async (_, { orderId }) => {
      try {
        return await Payment.findOne({ where: { orderId } });
      } catch (error) {
        logger.error('Error fetching payment:', error);
        throw new Error('Failed to fetch payment');
      }
    },

    payments: async (_, { userId, status }) => {
      try {
        const where = {};
        if (userId) where.userId = userId;
        if (status) where.status = status;
        
        return await Payment.findAll({ where });
      } catch (error) {
        logger.error('Error fetching payments:', error);
        throw new Error('Failed to fetch payments');
      }
    },

    course: async (_, { courseId, subdomain }) => {
      try {
        const user = await User.findOne({ where: { subdomain } });
        if (!user) throw new Error('User not found');
        
        return await thinkificService.getCourse(user.accessToken, courseId);
      } catch (error) {
        logger.error('Error fetching course:', error);
        throw new Error('Failed to fetch course');
      }
    }
  },

  Mutation: {
    createPayment: async (_, { input }) => {
      try {
        const { courseId, amount, subdomain, customerEmail } = input;
        
        const user = await User.findOne({ where: { subdomain } });
        if (!user) {
          return { success: false, error: 'User not found' };
        }

        const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Create external order in Thinkific
        const thinkificOrder = await thinkificService.createExternalOrder({
          accessToken: user.accessToken,
          courseId,
          amount,
          orderId
        });
        
        // Create payment in Duitku
        const duitkuPayment = await duitkuService.createPayment({
          orderId,
          amount,
          customerEmail: customerEmail || `${subdomain}@thinkific.com`
        });
        
        // Save payment record
        await Payment.create({
          orderId,
          userId: user.id,
          courseId,
          amount,
          paymentUrl: duitkuPayment.paymentUrl,
          duitkuReference: duitkuPayment.reference,
          thinkificOrderId: thinkificOrder.id
        });
        
        return {
          success: true,
          paymentUrl: duitkuPayment.paymentUrl,
          orderId
        };
      } catch (error) {
        logger.error('Payment creation failed:', error);
        return { success: false, error: 'Payment creation failed' };
      }
    },

    updatePaymentStatus: async (_, { orderId, status }) => {
      try {
        const [updatedRows] = await Payment.update(
          { status },
          { where: { orderId } }
        );
        
        if (updatedRows === 0) {
          throw new Error('Payment not found');
        }
        
        return await Payment.findOne({ where: { orderId } });
      } catch (error) {
        logger.error('Error updating payment status:', error);
        throw new Error('Failed to update payment status');
      }
    }
  }
};

module.exports = resolvers;
