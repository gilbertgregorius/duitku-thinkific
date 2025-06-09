const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { paymentValidation } = require('../middleware/validation');

router.post('/initiate', 
  paymentValidation.initiate,
  paymentController.initiatePayment
);

router.get('/status/:orderId',
  paymentController.getPaymentStatus
);

module.exports = router;