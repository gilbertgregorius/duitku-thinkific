/**
 * Webhook Configuration
 */
class WebhookConfig {
  constructor() {
    this.secret = process.env.WEBHOOK_SECRET;
  }

  validate() {
    if (!this.secret) {
      throw new Error('WEBHOOK_SECRET is required');
    }
  }

  getDebugInfo() {
    return {
      secret: this.secret ? 'SET' : 'NOT_SET'
    };
  }
}

module.exports = new WebhookConfig();
