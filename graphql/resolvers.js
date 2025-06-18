const Payment = require('../src/models/Payment');
const User = require('../src/models/User');

const logger = require('../src/utils/logger');

const duitku = require('../src/services/duitku');
const thinkific = require('../src/services/thinkific');


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

    product: async (_, { productId, subdomain }) => {
      try {
        const user = await User.findOne({ where: { subdomain } });
        if (!user) throw new Error('User not found');
        
        return await thinkific.getProduct(user.accessToken, productId);
      } catch (error) {
        logger.error('Error fetching product:', error);
        throw new Error('Failed to fetch product');
      }
    },

    products: async (_, { subdomain }) => {
      try {
        const user = await User.findOne({ where: { subdomain } });
        if (!user) throw new Error('User not found');
        
        const productsResponse = await thinkific.getProducts(user.accessToken);
        return productsResponse.items || [];
      } catch (error) {
        logger.error('Error fetching products:', error);
        throw new Error('Failed to fetch products');
      }
    }
  },

  Product: {
    price: (product) => {
      // Get price from the primary product_price or fallback to product.price
      const primaryPrice = product.product_prices?.find(p => p.is_primary);
      if (primaryPrice) {
        return parseFloat(primaryPrice.price) || 0;
      }
      return parseFloat(product.price) || 0;
    }
  },

  Mutation: {
    createPayment: async (_, { input }) => {
      try {
        const { productId, amount, subdomain, customerEmail } = input;
        
        const user = await User.findOne({ where: { subdomain } });
        if (!user) {
          return { success: false, error: 'User not found' };
        }

        const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Try to get or create user in Thinkific first
        // TODO: REMOVE IN PRODUCTION; USER CREATION IS NOT SCOPE OF THIS PROJECT
        let thinkificUserId;
        try {
          const thinkificUser = await thinkific.createUser(user.accessToken, {
            email: customerEmail || `${subdomain}@thinkific.com`,
            firstName: 'Test',
            lastName: 'User'
          });
          
          thinkificUserId = thinkificUser.id;
          logger.info('GraphQL: Thinkific user resolved:', { id: thinkificUserId, email: customerEmail });
          
        } catch (error) {
          logger.error('GraphQL: Failed to create/get Thinkific user:', error.message);
          return { success: false, error: 'Failed to create user in Thinkific' };
        }
        
        // Create external order in Thinkific using the provided productId
        const thinkificOrder = await thinkific.createExternalOrder({
          accessToken: user.accessToken,
          productId: productId,
          amount,
          orderId,
          userId: thinkificUserId,
        });
        
        // Create payment in Duitku
        const duitkuPayment = await duitku.initiatePayment({
          orderId,
          amount,
          customerEmail: customerEmail || `${subdomain}@thinkific.com`
        });
        
        // Save payment record
        await Payment.create({
          orderId,
          userId: user.id,
          productId, // Changed from courseId to productId
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
        logger.error('Payment creation failed:', {
          orderId,
          error: error.message
        });
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
        logger.error('Error updating payment status:', {
          orderId,
          error: error.message
        });
        throw new Error('Failed to update payment status');
      }
    }
  }
};

module.exports = resolvers;
