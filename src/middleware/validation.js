const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

const paymentValidation = {
  initiate: [
    body('courseName').notEmpty().withMessage('Course name is required'),
    body('coursePrice').isInt({ min: 1000 }).withMessage('Course price must be at least 1000 IDR'),
    body('customerName').notEmpty().withMessage('Customer name is required'),
    body('customerEmail').isEmail().withMessage('Valid email is required'),
    body('customerPhone').matches(/^\+?[1-9]\d{1,14}$/).withMessage('Valid phone number is required'),
    body('paymentMethod').isIn(['I1', 'M2', 'VA', 'BR', 'A1', 'CC', 'M1', 'C1', 'D1', 'OV', 'DA', 'LA', 'SP'])
      .withMessage('Invalid payment method'),
    body('returnUrl').isURL().withMessage('Valid return URL is required'),
    body('callbackUrl').isURL().withMessage('Valid callback URL is required'),
    handleValidationErrors
  ]
};

const webhookValidation = {
  duitku: [
    body('merchantOrderId').notEmpty().withMessage('Merchant order ID is required'),
    body('amount').notEmpty().withMessage('Amount is required'),
    body('resultCode').notEmpty().withMessage('Result code is required'),
    body('signature').notEmpty().withMessage('Signature is required'),
    handleValidationErrors
  ],
  
  thinkific: [
    body('resource').notEmpty().withMessage('Resource is required'),
    body('action').notEmpty().withMessage('Action is required'),
    body('payload').isObject().withMessage('Payload must be an object'),
    handleValidationErrors
  ]
};

module.exports = {
  paymentValidation,
  webhookValidation
};
