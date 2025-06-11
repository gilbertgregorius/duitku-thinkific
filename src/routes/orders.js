const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const db = require('../services/dataStore'); // Assuming you have a database service

// Get all orders with optional filtering
router.get('/', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    // In a real application, you would query your database
    // For now, we'll return mock data
    const mockOrders = [
      {
        id: 1,
        user_email: 'student1@example.com',
        course_name: 'JavaScript Fundamentals',
        amount: 150000,
        status: 'completed',
        payment_method: 'BCA Virtual Account',
        duitku_transaction_id: 'TXN123456',
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        user_email: 'student2@example.com',
        course_name: 'React Advanced Course',
        amount: 200000,
        status: 'pending',
        payment_method: 'Mandiri Virtual Account',
        duitku_transaction_id: 'TXN123457',
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 3,
        user_email: 'student3@example.com',
        course_name: 'Node.js Backend Development',
        amount: 250000,
        status: 'failed',
        payment_method: 'QRIS',
        duitku_transaction_id: 'TXN123458',
        created_at: new Date(Date.now() - 172800000).toISOString(),
      },
    ];

    let filteredOrders = mockOrders;
    if (status && status !== 'all') {
      filteredOrders = mockOrders.filter(order => order.status === status);
    }

    res.json(filteredOrders);
  } catch (error) {
    logger.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get single order
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock single order
    const mockOrder = {
      id: parseInt(id),
      user_email: 'student@example.com',
      course_name: 'Sample Course',
      amount: 150000,
      status: 'completed',
      payment_method: 'BCA Virtual Account',
      duitku_transaction_id: `TXN${id}`,
      created_at: new Date().toISOString(),
      metadata: {
        thinkific_course_id: 12345,
        enrollment_id: 67890,
      }
    };

    res.json(mockOrder);
  } catch (error) {
    logger.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Update order
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    logger.info(`Updating order ${id}:`, updateData);
    
    // In a real application, you would update the database
    const updatedOrder = {
      id: parseInt(id),
      ...updateData,
      updated_at: new Date().toISOString(),
    };

    res.json(updatedOrder);
  } catch (error) {
    logger.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Delete order
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info(`Deleting order ${id}`);
    
    // In a real application, you would delete from database
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    logger.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

module.exports = router;
