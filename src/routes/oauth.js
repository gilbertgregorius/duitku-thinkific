const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const router = express.Router();
const logger = require('../utils/logger');
const oauthConfig = require('../config/oauth');
const redisConfig = require('../config/redis');
const ErrorHandler = require('../middleware/errorHandler');

// Store code verifiers in Redis instead of memory
const getCodeVerifierKey = (state) => `oauth:verifier:${state}`;
const getTokenKey = (subdomain) => `oauth:token:${subdomain}`;

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

// INSTALL ENDPOINT - following THINKIFIC_OAUTH_API.md pattern
router.get('/install', (req, res) => {
    try {
        const subdomain = req.query.subdomain;
        
        if (!subdomain) {
            return res.status(400).json({ error: 'subdomain parameter is required' });
        }

        // GENERATE RANDOM STRING FOR CODE VERIFIER (128 chars as per doc)
        const code_verifier = crypto.randomBytes(96).toString('base64url'); // 128 chars
        
        // HASHED CODE VERIFIER VIA S256 METHOD & BASE64 ENCODE
        const base64Digest = crypto
            .createHash('sha256')
            .update(code_verifier)
            .digest('base64');
        
        const code_challenge = base64Digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        const state = code_verifier; // Use code_verifier as state as shown in doc
        // Fix potential double slash issue
        const baseUrl = process.env.APP_BASE_URL.endsWith('/') ? process.env.APP_BASE_URL.slice(0, -1) : process.env.APP_BASE_URL;
        const redirect_uri = `${baseUrl}/oauth/callback`;

        // Store code verifier with state as key
        codeVerifiers.set(state, { code_verifier, subdomain });

        logger.info('OAuth install initiated', {
            subdomain,
            state: state.substring(0, 10) + '...',
            redirect_uri
        });

        // Build authorization URL exactly as shown in THINKIFIC_OAUTH_API.md
        const authUrl = `https://${subdomain}.thinkific.com/oauth2/authorize?` +
            `client_id=${process.env.THINKIFIC_CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(redirect_uri)}&` +
            `state=${state}&` +
            `response_mode=query&` +
            `response_type=code id_token&` +
            `code_challenge=${code_challenge}&` +
            `code_challenge_method=S256&` +
            `scope=openid`;

        res.redirect(authUrl);

    } catch (error) {
        logger.error('OAuth install error:', error);
        res.status(500).json({ error: 'Failed to initiate OAuth flow' });
    }
});

// CALLBACK ENDPOINT - following THINKIFIC_OAUTH_API.md pattern exactly
router.get('/callback', async (req, res) => {
    try {
        const { code, state, subdomain, id_token } = req.query;

        if (!code || !state || !subdomain) {
            return res.status(400).json({ 
                error: 'Missing required parameters: code, state, or subdomain' 
            });
        }

        // Retrieve stored code verifier
        const storedData = codeVerifiers.get(state);
        if (!storedData) {
            return res.status(400).json({ error: 'Invalid or expired state parameter' });
        }

        const { code_verifier } = storedData;
        
        // Clean up stored verifier
        codeVerifiers.delete(state);

        // Exchange authorization code for access token - exactly as in doc
        const json = JSON.stringify({
            grant_type: 'authorization_code',
            code: code,
            code_verifier: code_verifier
        });

        // Create Basic Auth header - exactly as in doc  
        const authKey = Buffer.from(`${process.env.THINKIFIC_CLIENT_ID}:${process.env.THINKIFIC_CLIENT_SECRET || ''}`).toString('base64');

        // RETRIEVE ACCESS TOKEN - using exact pattern from doc
        const tokenResponse = await axios.post(
            `https://${subdomain}.thinkific.com/oauth2/token`,
            json,
            {
                headers: {
                    'Authorization': `Basic ${authKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const { access_token, refresh_token, expires_in, gid } = tokenResponse.data;

        // Store installation data
        const installationData = {
            subdomain,
            access_token,
            refresh_token,
            id_token,
            expires_in,
            gid,
            installed_at: new Date().toISOString()
        };

        // Store in global map (in production, store in database)
        global.thinkificInstallations = global.thinkificInstallations || new Map();
        global.thinkificInstallations.set(subdomain, installationData);

        logger.info('OAuth installation completed', {
            subdomain,
            gid,
            expires_in,
            has_access_token: !!access_token,
            has_id_token: !!id_token
        });

        // Redirect to success page - will implement React frontend later
        res.json({
            success: true,
            message: 'Installation completed successfully',
            subdomain,
            gid,
            redirect: `/dashboard?subdomain=${subdomain}&status=installed`
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

// Get installation status
router.get('/status/:subdomain', (req, res) => {
    const { subdomain } = req.params;
    
    const installations = global.thinkificInstallations || new Map();
    const installation = installations.get(subdomain);
    
    if (!installation) {
        return res.json({ installed: false });
    }

    res.json({
        installed: true,
        subdomain: installation.subdomain,
        installed_at: installation.installed_at,
        gid: installation.gid,
        expires_in: installation.expires_in
    });
});

// Revoke access (uninstall) - following doc pattern
router.post('/revoke', async (req, res) => {
    try {
        const { subdomain } = req.body;
        
        const installations = global.thinkificInstallations || new Map();
        const installation = installations.get(subdomain);
        
        if (!installation) {
            return res.status(404).json({ error: 'Installation not found' });
        }

        // Revoke tokens at Thinkific - using application/x-www-form-urlencoded as per doc
        await axios.post(
            `https://${subdomain}.thinkific.com/oauth2/revoke`,
            `token=${installation.access_token}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        // Remove from local storage
        installations.delete(subdomain);

        logger.info('OAuth access revoked', { subdomain });

        res.json({ success: true, message: 'Access revoked successfully' });

    } catch (error) {
        logger.error('OAuth revoke error:', error);
        res.status(500).json({ error: 'Failed to revoke access' });
    }
});

module.exports = router;