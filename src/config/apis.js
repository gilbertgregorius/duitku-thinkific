/**
 * External APIs Configuration
 */
class APIsConfig {
  constructor() {
    this.duitku = {
      merchantCode: process.env.DUITKU_MERCHANT_CODE,
      apiKey: process.env.DUITKU_API_KEY,
      environment: process.env.DUITKU_ENVIRONMENT || 'sandbox',
      baseUrl: this.getDuitkuBaseUrl(),
      timeout: 30000
    };

    this.thinkific = {
      apiKey: process.env.THINKIFIC_API_KEY,
      subdomain: process.env.THINKIFIC_SUBDOMAIN,
      baseUrl: this.getThinkificBaseUrl(),
      timeout: 15000
    };

    this.webhook = {
      secret: process.env.WEBHOOK_SECRET,
      duitkuPath: '/webhooks/duitku/callback',
      thinkificPath: '/webhooks/thinkific'
    };
  }

  getDuitkuBaseUrl() {
    return this.duitku?.environment === 'production' 
      ? 'https://passport.duitku.com'
      : 'https://sandbox.duitku.com';
  }

  getThinkificBaseUrl() {
    return this.thinkific?.subdomain 
      ? `https://${this.thinkific.subdomain}.thinkific.com/api/v1`
      : 'https://api.thinkific.com/api/v1';
  }

  getDuitkuWebhookUrl() {
    const baseUrl = process.env.APP_BASE_URL?.endsWith('/') 
      ? process.env.APP_BASE_URL.slice(0, -1) 
      : process.env.APP_BASE_URL;
    
    return `${baseUrl}${this.webhook.duitkuPath}`;
  }

  getThinkificWebhookUrl() {
    const baseUrl = process.env.APP_BASE_URL?.endsWith('/') 
      ? process.env.APP_BASE_URL.slice(0, -1) 
      : process.env.APP_BASE_URL;
    
    return `${baseUrl}${this.webhook.thinkificPath}`;
  }

  validate() {
    const errors = [];

    // Validate Duitku config
    if (!this.duitku.merchantCode) {
      errors.push('DUITKU_MERCHANT_CODE is required');
    }
    if (!this.duitku.apiKey) {
      errors.push('DUITKU_API_KEY is required');
    }

    // Validate Thinkific config
    if (!this.thinkific.apiKey) {
      errors.push('THINKIFIC_API_KEY is required');
    }
    if (!this.thinkific.subdomain) {
      errors.push('THINKIFIC_SUBDOMAIN is required');
    }

    // Validate webhook config
    if (!this.webhook.secret) {
      errors.push('WEBHOOK_SECRET is required');
    }

    if (errors.length > 0) {
      throw new Error(`API configuration errors: ${errors.join(', ')}`);
    }
  }

  getDebugInfo() {
    return {
      duitku: {
        merchantCode: this.duitku.merchantCode ? `${this.duitku.merchantCode.substring(0, 4)}...` : 'NOT_SET',
        apiKey: this.duitku.apiKey ? 'SET' : 'NOT_SET',
        environment: this.duitku.environment,
        baseUrl: this.duitku.baseUrl,
        webhookUrl: this.getDuitkuWebhookUrl()
      },
      thinkific: {
        apiKey: this.thinkific.apiKey ? 'SET' : 'NOT_SET',
        subdomain: this.thinkific.subdomain,
        baseUrl: this.thinkific.baseUrl,
        webhookUrl: this.getThinkificWebhookUrl()
      },
      webhook: {
        secret: this.webhook.secret ? 'SET' : 'NOT_SET'
      }
    };
  }
}

module.exports = new APIsConfig();
