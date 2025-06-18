/**
 * Duitku API Configuration
 */
class DuitkuConfig {
  constructor() {
    this.merchantCode = process.env.DUITKU_MERCHANT_CODE;
    this.apiKey = process.env.DUITKU_API_KEY;
    this.environment = process.env.DUITKU_ENVIRONMENT || 'sandbox';
    this.baseUrl = this.getBaseUrl();
    this.timeout = 30000;
    this.webhookPath = '/webhooks/duitku/callback';
  }

  getBaseUrl() {
    return this.environment === 'production' 
      ? 'https://api-passport.duitku.com'
      : 'https://api-sandbox.duitku.com';
  }

  getWebhookUrl() {
    const baseUrl = process.env.APP_BASE_URL?.endsWith('/') 
      ? process.env.APP_BASE_URL.slice(0, -1) 
      : process.env.APP_BASE_URL;
    
    return `${baseUrl}${this.webhookPath}`;
  }

  validate() {
    const errors = [];
    if (!this.merchantCode) errors.push('DUITKU_MERCHANT_CODE is required');
    if (!this.apiKey) errors.push('DUITKU_API_KEY is required');
    
    if (errors.length > 0) {
      throw new Error(`Duitku configuration errors: ${errors.join(', ')}`);
    }
  }

  getDebugInfo() {
    return {
      merchantCode: this.merchantCode ? `SET` : 'NOT_SET',
      apiKey: this.apiKey ? 'SET' : 'NOT_SET',
      environment: this.environment,
      baseUrl: this.baseUrl,
      webhookUrl: this.getWebhookUrl()
    };
  }
}

module.exports = new DuitkuConfig();
