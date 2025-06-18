const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const { body } = require('express-validator');
const logger = require('../utils/logger');
const thinkific = require('../services/thinkific');

const getAccessToken = async (subdomain) => {
  const User = require('../models/User');
  const user = await User.findOne({ where: { subdomain } });
  if (!user?.accessToken) {
    throw new Error(`No access token found for subdomain: ${subdomain}`);
  }
  return user.accessToken;
};

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

// GET /enrollments/:id - Get single enrollment
router.get('/:id', async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const accessToken = await getAccessToken(req.subdomain);
    
    // Fetch enrollment from Thinkific API
    const enrollment = await thinkific.getEnrollment(accessToken, enrollmentId);

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Return enrollment in expected format
    res.json({enrollment});
  } catch (error) {
    logger.error('Error fetching enrollment:', error);
    res.status(500).json({ error: 'Failed to fetch enrollment' });
  }
});

// POST /enrollments - Create new enrollment
router.post('/', [
  body('course_id').isInt().withMessage('Course ID must be an integer'),
  body('user_id').isInt().withMessage('User ID must be an integer'),
  body('activated_at').optional().isISO8601().withMessage('Activated at must be a valid date'),
  body('expiry_date').optional().isISO8601().withMessage('Expiry date must be a valid date')
], async (req, res) => {
  try {
    const { course_id, user_id, activated_at, expiry_date } = req.body;
    const accessToken = await getAccessToken(req.subdomain);
    
    const enrollmentData = {
      course_id,
      user_id,
      activated_at: activated_at || new Date().toISOString(),
      expiry_date
    };

    // Create enrollment via Thinkific API
    const enrollment = await thinkific.createEnrollment(accessToken, enrollmentData);
    
    res.status(201).json(enrollment);
  } catch (error) {
    logger.error('Error creating enrollment:', error);
    res.status(500).json({ error: 'Failed to create enrollment' });
  }
});

// PUT /enrollments/:id - Update enrollment
router.put('/:id', [
  body('activated_at').optional().isISO8601().withMessage('Activated at must be a valid date'),
  body('expiry_date').optional().isISO8601().withMessage('Expiry date must be a valid date')
], async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { activated_at, expiry_date } = req.body;
    const accessToken = await getAccessToken(req.subdomain);
    
    const updateData = {};
    if (activated_at) updateData.activated_at = activated_at;
    if (expiry_date) updateData.expiry_date = expiry_date;
    
    logger.info(`Updating enrollment ${enrollmentId}:`, updateData);
    
    // Update enrollment via Thinkific API
    const updatedEnrollment = await thinkific.updateEnrollment(accessToken, enrollmentId, updateData);

    res.status(204).json(updatedEnrollment);
  } catch (error) {
    logger.error('Error updating enrollment:', error);
    res.status(500).json({ error: 'Failed to update enrollment' });
  }
});

// DELETE /enrollments/:id - Delete enrollment
router.delete('/:id', async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const accessToken = await getAccessToken(req.subdomain);
    
    logger.info(`Deleting enrollment ${enrollmentId}`);
    
    // Delete enrollment via Thinkific API
    const response = await thinkific.deleteEnrollment(accessToken, enrollmentId);

    res.json(response);
  } catch (error) {
    logger.error('Error deleting enrollment:', error);
    res.status(500).json({ error: 'Failed to delete enrollment' });
  }
});

// POST /api/enrollment - Manual enrollment for testing (keep for backward compatibility)
router.post('/manual', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('courseName').notEmpty().withMessage('Course name is required'),
  body('customerName').notEmpty().withMessage('Customer name is required')
], enrollmentController.enrollUser);

module.exports = router;
