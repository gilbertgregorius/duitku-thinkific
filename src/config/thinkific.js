/**
 * Thinkific API Configuration
 */
class ThinkificConfig {
  constructor() {
    this.apiKey = process.env.THINKIFIC_API_KEY;
    this.subdomain = process.env.THINKIFIC_SUBDOMAIN;
    this.baseUrl = 'https://api.thinkific.com/api/v1';
    this.timeout = 15000;
    this.webhookPath = '/webhooks/thinkific';
  }

  getWebhookUrl() {
    const baseUrl = process.env.APP_BASE_URL?.endsWith('/') 
      ? process.env.APP_BASE_URL.slice(0, -1) 
      : process.env.APP_BASE_URL;
    
    return `${baseUrl}${this.webhookPath}`;
  }

  validate() {
    const errors = [];
    if (!this.apiKey) errors.push('THINKIFIC_API_KEY is required');
    if (!this.subdomain) errors.push('THINKIFIC_SUBDOMAIN is required');
    
    if (errors.length > 0) {
      throw new Error(`Thinkific configuration errors: ${errors.join(', ')}`);
    }
  }

  getDebugInfo() {
    return {
      apiKey: this.apiKey ? 'SET' : 'NOT_SET',
      subdomain: this.subdomain,
      baseUrl: this.baseUrl,
      webhookUrl: this.getWebhookUrl()
    };
  }
}

module.exports = new ThinkificConfig();
