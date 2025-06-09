const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { webhookValidation } = require('../middleware/validation');

// Duitku payment webhooks
router.post('/duitku', 
  webhookValidation.duitku,
  (req, res) => webhookController.handleDuitkuWebhook(req, res)
);

// Thinkific enrollment webhooks
router.post('/thinkific',
  webhookValidation.thinkific,
  (req, res) => webhookController.handleThinkificWebhook(req, res)
);

// Universal webhook handler (auto-detects source) - supports all HTTP methods
router.all('/universal',
  (req, res) => webhookController.handleUniversalWebhook(req, res)
);

module.exports = router;