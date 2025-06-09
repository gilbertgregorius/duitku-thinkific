const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const { body } = require('express-validator');

// POST /api/enrollment - Manual enrollment for testing
router.post('/', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('courseName').notEmpty().withMessage('Course name is required'),
  body('customerName').notEmpty().withMessage('Customer name is required')
], enrollmentController.enrollUser);

module.exports = router;
