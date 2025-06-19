const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { paymentValidation } = require('../middleware/validation');

router.post('/initiate', 
  paymentValidation.initiate,
  (req, res) => paymentController.initiatePayment(req, res)
);

router.get('/status/:orderId',
  (req, res) => paymentController.getPaymentStatus(req, res)
);

// Simple stateless callback endpoint for Duitku
router.post('/callback', 
  (req, res) => paymentController.handleDuitkuCallback(req, res)
);

module.exports = router;