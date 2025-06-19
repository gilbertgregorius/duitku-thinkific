const express = require('express');
const router = express.Router();
const webhook = require('../controllers/webhook');
const { webhookValidation } = require('../middleware/validation');

// Duitku payment webhooks
router.post('/duitku', 
  webhookValidation.duitku,
  (req, res) => webhook.handleDuitkuCallback(req, res)
);

// Thinkific enrollment webhooks
router.post('/thinkific',
  webhookValidation.thinkific,
  (req, res) => webhook.handleThinkificWebhook(req, res)
);

module.exports = router;