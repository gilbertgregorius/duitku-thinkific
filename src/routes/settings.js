const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Get current settings
router.get('/', async (req, res) => {
  try {
    // Return current environment variables (without sensitive data)
    const settings = {
      duitku_environment: process.env.DUITKU_ENVIRONMENT || 'sandbox',
      thinkific_subdomain: process.env.THINKIFIC_SUBDOMAIN || '',
      auto_enrollment: true,
      email_notifications: true,
    };
    
    res.json(settings);
  } catch (error) {
    logger.error('Error getting settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Update settings
router.post('/', async (req, res) => {
  try {
    const { duitku_environment, thinkific_subdomain, auto_enrollment, email_notifications } = req.body;
    
    // In a real application, you would save these to a database
    // For now, we'll just return success
    logger.info('Settings updated:', { duitku_environment, thinkific_subdomain });
    
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    logger.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
