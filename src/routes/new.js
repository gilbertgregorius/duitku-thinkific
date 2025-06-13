const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const signatureValidation = require('../middleware/signatureValidation');

// Show checkout page (new Thinkific integration method)
router.get('/checkout', paymentController.showCheckout);

// Create payment (new Thinkific integration method)
router.post('/create', signatureValidation, paymentController.createPayment);

// Payment success page (new Thinkific integration method)
router.get('/success', paymentController.showSuccess);

// Payment failure page (new Thinkific integration method)
router.get('/failure', paymentController.showFailure);

module.exports = router;