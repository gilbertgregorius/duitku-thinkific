const express = require('express');
const router = express.Router();
const payment = require('../controllers/payment');
const { paymentValidation } = require('../middleware/validation');

router.post('/initiate', 
  paymentValidation.initiate,
  (req, res) => payment.createInvoice(req, res)
);

module.exports = router;