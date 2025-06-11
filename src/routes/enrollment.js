const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const { body } = require('express-validator');
const logger = require('../utils/logger');

// GET /enrollments - Get all enrollments for frontend
router.get('/', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    // Mock enrollments data for frontend
    const mockEnrollments = [
      {
        id: 1,
        user_email: 'student1@example.com',
        course_name: 'JavaScript Fundamentals',
        thinkific_user_id: 1001,
        thinkific_course_id: 2001,
        enrollment_status: 'active',
        enrolled_at: new Date().toISOString(),
        progress: 45,
      },
      {
        id: 2,
        user_email: 'student2@example.com',
        course_name: 'React Advanced Course',
        thinkific_user_id: 1002,
        thinkific_course_id: 2002,
        enrollment_status: 'active',
        enrolled_at: new Date(Date.now() - 86400000).toISOString(),
        progress: 75,
      },
      {
        id: 3,
        user_email: 'student3@example.com',
        course_name: 'Node.js Backend Development',
        thinkific_user_id: 1003,
        thinkific_course_id: 2003,
        enrollment_status: 'suspended',
        enrolled_at: new Date(Date.now() - 172800000).toISOString(),
        progress: 20,
      },
    ];

    let filteredEnrollments = mockEnrollments;
    if (status && status !== 'all') {
      filteredEnrollments = mockEnrollments.filter(enrollment => enrollment.enrollment_status === status);
    }

    res.json(filteredEnrollments);
  } catch (error) {
    logger.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// PUT /enrollments/:id - Update enrollment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    logger.info(`Updating enrollment ${id}:`, updateData);
    
    const updatedEnrollment = {
      id: parseInt(id),
      ...updateData,
      updated_at: new Date().toISOString(),
    };

    res.json(updatedEnrollment);
  } catch (error) {
    logger.error('Error updating enrollment:', error);
    res.status(500).json({ error: 'Failed to update enrollment' });
  }
});

// DELETE /enrollments/:id - Delete enrollment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info(`Deleting enrollment ${id}`);
    
    res.json({ message: 'Enrollment deleted successfully' });
  } catch (error) {
    logger.error('Error deleting enrollment:', error);
    res.status(500).json({ error: 'Failed to delete enrollment' });
  }
});

// POST /api/enrollment - Manual enrollment for testing
router.post('/', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('courseName').notEmpty().withMessage('Course name is required'),
  body('customerName').notEmpty().withMessage('Customer name is required')
], enrollmentController.enrollUser);

// Check enrollment status endpoint (for testing)
router.get('/check/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const enrollments = await dataStore.getEnrollmentsByEmail(email);
    
    res.json({
      success: true,
      email: email,
      enrollments: enrollments,
      count: enrollments?.length || 0
    });
  } catch (error) {
    logger.error('Error checking enrollment status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check enrollment status',
      message: error.message
    });
  }
});

module.exports = router;
