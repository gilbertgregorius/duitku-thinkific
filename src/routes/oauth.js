const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const router = express.Router();
const logger = require('../utils/logger');
const oauthConfig = require('../config/oauthConfig');
const ErrorHandler = require('../middleware/errorHandler');
const tokenManager = require('../utils/tokenManager');

// Store code verifiers in Redis for cross-process sharing
const redis = require('redis');
let redisClient = null;

// Initialize Redis client
async function getRedisClient() {
  if (!redisClient) {
    redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    await redisClient.connect();
  }
  return redisClient;
}

// Store code verifiers in Redis instead of memory
const getCodeVerifierKey = (state) => `oauth:verifier:${state}`;

// DEBUG ENDPOINT - to check OAuth configuration
router.get('/debug', ErrorHandler.asyncHandler(async (req, res) => {
  try {
    const debugInfo = oauthConfig.getDebugInfo();
    
    // Test subdomain for demonstration
    const testSubdomain = req.query.subdomain || 'duitku';
    const testState = crypto.randomBytes(32).toString('base64url');
    const testChallenge = 'test_challenge_12345';
    
    debugInfo.sampleAuthUrl = oauthConfig.getAuthorizationUrl(testSubdomain, testState, testChallenge);
    debugInfo.tokenEndpoint = oauthConfig.getTokenEndpoint(testSubdomain);
    
    res.json({
      success: true,
      oauth_configuration: debugInfo,
      notes: {
        redirect_uri_to_configure: debugInfo.redirectUri,
        message: "Use the redirect_uri above in your Thinkific Partner App configuration"
      }
    });
  } catch (error) {
    logger.error('OAuth debug error:', error);
    ErrorHandler.sendError(res, 'Failed to get OAuth debug info', 500);
  }
}));

// INSTALL ENDPOINT
router.get('/install', async (req, res) => {
    try {
        const subdomain = req.query.subdomain;
        
        if (!subdomain) {
            return res.status(400).json({ error: 'subdomain parameter is required' });
        }

        // GENERATE RANDOM STRING FOR CODE VERIFIER (128 chars as per PKCE doc)
        const code_verifier = crypto.randomBytes(96).toString('base64url'); // 128 chars
        
        // HASHED CODE VERIFIER VIA S256 METHOD & BASE64 ENCODE (PKCE)
        const base64Digest = crypto
            .createHash('sha256')
            .update(code_verifier)
            .digest('base64');
        
        const code_challenge = base64Digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        const state = code_verifier; // Use code_verifier as state as shown in doc
        
        // Fix potential double slash issue
        const baseUrl = process.env.APP_BASE_URL.endsWith('/') ? process.env.APP_BASE_URL.slice(0, -1) : process.env.APP_BASE_URL;
        const redirect_uri = `${baseUrl}/oauth/callback`;

        // Store code verifier with state as key in Redis
        const client = await getRedisClient();
        await client.setEx(getCodeVerifierKey(state), 600, JSON.stringify({ 
            code_verifier,
            subdomain,
            created_at: Date.now()
        })); // Expire in 10 minutes

        logger.info('OAuth install initiated', {
            subdomain,
            state: state.substring(0, 10) + '...',
            redirect_uri
        });

        // Build authorization URL with PKCE for OAuth 2.0 (NOT OIDC)
        const authUrl = `https://${subdomain}.thinkific.com/oauth2/authorize?` +
            `client_id=${process.env.THINKIFIC_CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(redirect_uri)}&` +
            `state=${state}&` +
            `response_mode=query&` +
            `response_type=code&` + // Pure OAuth 2.0, not OIDC
            `code_challenge=${code_challenge}&` +
            `code_challenge_method=S256`; // PKCE with S256

        res.redirect(authUrl);

    } catch (error) {
        logger.error('OAuth install error:', error);
        res.status(500).json({ error: 'Failed to initiate OAuth flow' });
    }
});

// CALLBACK ENDPOINT
router.get('/callback', async (req, res) => {
    try {
        const { code, state, subdomain, id_token } = req.query;

        if (!code || !state || !subdomain) {
            return res.status(400).json({ 
                error: 'Missing required parameters: code, state, or subdomain' 
            });
        }

        // Retrieve stored state info from Redis
        const client = await getRedisClient();
        const storedDataJson = await client.get(getCodeVerifierKey(state));
        
        if (!storedDataJson) {
            logger.error('OAuth callback: Invalid or expired state parameter', { state: state.substring(0, 10) + '...' });
            return res.status(400).json({ error: 'Invalid or expired state parameter' });
        }

        const storedData = JSON.parse(storedDataJson);
        const { code_verifier } = storedData; // Extract code_verifier for PKCE
        
        // Clean up stored state
        await client.del(getCodeVerifierKey(state));

        // Exchange authorization code for access token with PKCE
        const json = JSON.stringify({
            grant_type: 'authorization_code',
            code: code,
            code_verifier: code_verifier // Required for PKCE
        });

        // Create Basic Auth header
        const authKey = Buffer.from(`${process.env.THINKIFIC_CLIENT_ID}:${process.env.THINKIFIC_CLIENT_SECRET || ''}`).toString('base64');

        // RETRIEVE ACCESS TOKEN
        const tokenResponse = await axios.post(
            `https://${subdomain}.thinkific.com/oauth2/token`,
            json,
            {
                headers: {
                    'Authorization': `Basic ${authKey}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'DuitkuThinkific/1.0.0'
                }
            }
        );

        const { access_token, refresh_token, token_type, expires_in, gid } = tokenResponse.data;
        logger.info('OAuth token received', {
            access_token: access_token.substring(0, 10) + '...',
        });

        const expiresAt = new Date(Date.now() + (expires_in * 1000));
        await tokenManager.storeToken(access_token, refresh_token, expiresAt);

        res.json({
            success: true,
            message: 'Installation completed successfully',
            expires_at: expiresAt.toISOString()
        });

    } catch (error) {
        logger.error('OAuth callback error:', error);
        
        if (error.response) {
            logger.error('Token exchange failed:', {
                status: error.response.status,
                data: error.response.data
            });
        }

        res.status(500).json({
            success: false,
            error: 'OAuth callback failed',
            message: error.message
        });
    }
});

// Get installation status - use tokenManager instead of global storage
router.get('/status/:subdomain', async (req, res) => {
    try {
        const hasToken = await tokenManager.hasValidToken();
        const tokenInfo = hasToken ? await tokenManager.getTokenInfo() : null;
        
        res.json({
            installed: hasToken,
            subdomain: req.params.subdomain,
            token_info: tokenInfo
        });
    } catch (error) {
        logger.error('Error checking installation status:', error);
        res.status(500).json({ 
            installed: false, 
            error: 'Failed to check status' 
        });
    }
});

// Revoke access (uninstall) - use tokenManager to get token
router.post('/revoke', async (req, res) => {
    try {
        const { subdomain } = req.body;
        
        if (!subdomain) {
            return res.status(400).json({ error: 'subdomain is required' });
        }

        // Get token from tokenManager instead of global storage
        const accessToken = await tokenManager.getToken();
        
        if (!accessToken) {
            return res.status(404).json({ error: 'No access token found to revoke' });
        }

        // Revoke tokens at Thinkific
        await axios.post(
            `https://${subdomain}.thinkific.com/oauth2/revoke`,
            `token=${accessToken}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        // Remove token from tokenManager
        await tokenManager.removeToken();

        logger.info('OAuth access revoked', { subdomain });

        res.json({ success: true, message: 'Access revoked successfully' });

    } catch (error) {
        logger.error('OAuth revoke error:', error);
        res.status(500).json({ error: 'Failed to revoke access' });
    }
});

// Token status endpoint
router.get('/token-status', async (req, res) => {
  try {
    const tokenInfo = await tokenManager.getTokenInfo();
    const accessToken = await tokenManager.getToken();

    res.json({
      success: true,
      tokenInfo,
      hasToken: !!accessToken,
      tokenPreview: accessToken ? accessToken.substring(0, 10) + '...' : null
    });

  } catch (error) {
    logger.error('Error checking token status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check token status',
      message: error.message
    });
  }
});

module.exports = router;