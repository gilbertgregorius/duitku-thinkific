const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { webhookValidation } = require('../middleware/validation');

// Duitku payment webhooks
router.post('/duitku', 
  webhookValidation.duitku,
  webhookController.handleDuitkuWebhook
);

// Thinkific enrollment webhooks
router.post('/thinkific',
  webhookValidation.thinkific,
  webhookController.handleThinkificWebhook
);

module.exports = router;