/**
 * OAuth Configuration for Thinkific Partner App
 */
class OAuthConfig {
  constructor() {
    this.clientId = process.env.THINKIFIC_CLIENT_ID;
    this.clientSecret = process.env.THINKIFIC_CLIENT_SECRET;
    this.baseUrl = process.env.APP_BASE_URL;
    // Updated scopes to include user management and all necessary permissions
    this.scopes = [
      'read:users',           // To access /users/me endpoint
      'write:enrollments',    // To create enrollments
      'write:external_orders', // To create external orders
      'read:orders',          // To read orders
      'write:courses',        // To access courses
      'read:courses',         // To read course data
      'read:products'         // To read products data
    ];
    this.responseType = 'code';  // Changed from 'code id_token' to just 'code' for non-OIDC
    this.responseMode = 'query';
    this.codeChallengeMethod = 'S256';
    this.redirectPath = '/oauth/callback';
  }

  validate() {
    const errors = [];
    
    if (!this.clientId) errors.push('THINKIFIC_CLIENT_ID');
    if (!this.clientSecret) errors.push('THINKIFIC_CLIENT_SECRET');
    if (!this.baseUrl) errors.push('APP_BASE_URL');
    
    if (errors.length > 0) {
      throw new Error(`OAuth configuration errors - missing: ${errors.join(', ')}`);
    }

    // Validate base URL format
    if (!this.baseUrl.startsWith('http')) {
      throw new Error('APP_BASE_URL must start with http:// or https://');
    }
  }

  getRedirectUri() {
    const baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    return `${baseUrl}${this.redirectPath}`;
  }

  getAuthorizationUrl(subdomain, state, codeChallenge) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.getRedirectUri(),
      state: state,
      response_mode: this.responseMode,
      response_type: this.responseType,
      code_challenge: codeChallenge,
      code_challenge_method: this.codeChallengeMethod,
      scope: this.scopes.join(' ')
    });

    return `https://${subdomain}.thinkific.com/oauth2/authorize?${params.toString()}`;
  }

  getTokenEndpoint(subdomain) {
    return `https://${subdomain}.thinkific.com/oauth2/token`;
  }

  getDebugInfo() {
    return {
      clientId: this.clientId ? `${this.clientId.substring(0, 8)}...` : 'NOT_SET',
      clientSecret: this.clientSecret ? 'SET' : 'NOT_SET',
      baseUrl: this.baseUrl,
      redirectUri: this.getRedirectUri(),
      scopes: this.scopes,
      responseType: this.responseType,
      responseMode: this.responseMode,
      codeChallengeMethod: this.codeChallengeMethod
    };
  }
}

module.exports = new OAuthConfig();
