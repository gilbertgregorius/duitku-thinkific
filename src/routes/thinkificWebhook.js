const express = require('express');
const crypto = require('crypto');
const DataStore = require('../services/dataStore');
const ThinkificService = require('../services/thinkificServices');
const config = require('../config');
const logger = require('../utils/logger');

const router = express.Router();
const dataStore = new DataStore();
const thinkificService = new ThinkificService(config.thinkific);

// Middleware to verify Thinkific webhook signature
const verifyThinkificSignature = (req, res, next) => {
    try {
        const signature = req.headers['x-thinkific-webhook-secret'];
        const expectedSecret = process.env.THINKIFIC_WEBHOOK_SECRET;
        
        if (!expectedSecret) {
            logger.warn('THINKIFIC_WEBHOOK_SECRET not configured');
            return res.status(500).json({ error: 'Webhook secret not configured' });
        }
        
        if (signature !== expectedSecret) {
            logger.warn('Invalid Thinkific webhook signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }
        
        next();
    } catch (error) {
        logger.error('Error verifying Thinkific signature:', error);
        res.status(500).json({ error: 'Signature verification failed' });
    }
};

// Handle Thinkific order completion webhooks
router.post('/thinkific-order', verifyThinkificSignature, async (req, res) => {
    try {
        const { event, data, timestamp } = req.body;
        
        logger.info('Received Thinkific order webhook:', {
            event,
            orderId: data.orderId,
            customerEmail: data.customerEmail,
            total: data.total,
            courseIds: data.courseIds
        });
        
        if (event !== 'order.completed') {
            logger.warn('Ignoring non-order event:', event);
            return res.json({ status: 'ignored', event });
        }
        
        // Process the order
        await processThinkificOrder(data);
        
        res.json({ 
            status: 'success', 
            message: 'Order processed successfully',
            orderId: data.orderId 
        });
        
    } catch (error) {
        logger.error('Error processing Thinkific order webhook:', error);
        res.status(500).json({ 
            error: 'Failed to process order', 
            message: error.message 
        });
    }
});


// Process Thinkific order and handle enrollments
async function processThinkificOrder(orderData) {
    try {
        // Store the order in our database
        const paymentData = {
            reference: `THINKIFIC_${orderData.orderId}`,
            amount: parseFloat(orderData.total),
            customer_name: orderData.customerName,
            customer_email: orderData.customerEmail,
            customer_phone: orderData.customerPhone,
            status: 'success',
            payment_method: 'thinkific',
            created_at: new Date(orderData.createdAt),
            metadata: JSON.stringify({
                thinkific_order_id: orderData.orderId,
                thinkific_order_number: orderData.orderNumber,
                course_ids: orderData.courseIds,
                course_names: orderData.courseNames,
                currency: orderData.currency,
                source: 'thinkific_order_tracking'
            })
        };
        
        // Store payment record
        await dataStore.storePayment(paymentData);
        
        logger.info('Stored Thinkific order:', {
            reference: paymentData.reference,
            amount: paymentData.amount,
            customer_email: paymentData.customer_email,
            course_count: orderData.courseIds.length
        });
        
        // Process enrollments for each course
        for (let i = 0; i < orderData.courseIds.length; i++) {
            const courseId = orderData.courseIds[i];
            const courseName = orderData.courseNames[i];
            
            try {
                await processThinkificEnrollment({
                    courseId,
                    courseName,
                    customerEmail: orderData.customerEmail,
                    customerName: orderData.customerName,
                    orderId: orderData.orderId,
                    reference: paymentData.reference
                });
            } catch (enrollmentError) {
                logger.error(`Failed to process enrollment for course ${courseId}:`, enrollmentError);
                // Continue with other courses even if one fails
            }
        }
        
    } catch (error) {
        logger.error('Error processing Thinkific order:', error);
        throw error;
    }
}

// Handle individual course enrollment from Thinkific order
async function processThinkificEnrollment(data) {
    try {
        const { courseId, courseName, customerEmail, customerName, orderId, reference } = data;
        
        logger.info('Processing Thinkific enrollment:', {
            courseId,
            courseName,
            customerEmail,
            orderId
        });
        
        // Check if user exists in Thinkific
        let user;
        try {
            user = await thinkificService.getUserByEmail(customerEmail);
            logger.info('User lookup result:', { 
                email: customerEmail, 
                found: !!user, 
                userId: user?.id 
            });
        } catch (error) {
            logger.error('Error looking up user by email:', error);
            user = null;
        }
        
        if (!user) {
            // Create user in Thinkific if they don't exist
            const [firstName, ...lastNameParts] = customerName.split(' ');
            const lastName = lastNameParts.join(' ') || '';
            
            logger.info('Creating new user in Thinkific:', {
                email: customerEmail,
                firstName,
                lastName
            });
            
            try {
                user = await thinkificService.createUser({
                    email: customerEmail,
                    first_name: firstName,
                    last_name: lastName,
                    send_welcome_email: false // They already purchased, no need for welcome email
                });
                
                logger.info('Created new Thinkific user:', { 
                    userId: user.id, 
                    email: customerEmail 
                });
            } catch (error) {
                logger.error('Error creating user in Thinkific:', error);
                throw new Error(`Failed to create user: ${error.message}`);
            }
        }
        
        // Enroll user in the course
        const enrollment = await thinkificService.enrollUser(user.id, courseId);
        
        // Store enrollment record
        await dataStore.storeEnrollment({
            payment_reference: reference,
            thinkific_user_id: user.id,
            thinkific_course_id: courseId,
            thinkific_enrollment_id: enrollment.id,
            customer_email: customerEmail,
            course_name: courseName,
            enrollment_date: new Date(),
            source: 'thinkific_order',
            metadata: JSON.stringify({
                thinkific_order_id: orderId,
                enrollment_status: enrollment.status || 'active'
            })
        });
        
        logger.info('Successfully processed Thinkific enrollment:', {
            userId: user.id,
            courseId,
            enrollmentId: enrollment.id,
            customerEmail
        });
        
        return enrollment;
        
    } catch (error) {
        logger.error('Error processing Thinkific enrollment:', error);
        throw error;
    }
}

module.exports = router;
