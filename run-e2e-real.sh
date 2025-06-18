#!/bin/bash

echo "🚀 Starting E2E Test with Real APIs"
echo "====================================="

# Load environment variables from .env.test
if [ -f .env.test ]; then
    export $(cat .env.test | grep -v '^#' | xargs)
    echo "✅ Loaded environment variables from .env.test"
else
    echo "❌ .env.test file not found"
    exit 1
fi

# Check if required environment variables are set
if [[ -z "$TEST_EMAIL" || -z "$TEST_SUBDOMAIN" || -z "$NGROK_URL" ]]; then
    echo "❌ Missing required environment variables in .env.test"
    echo "Required variables:"
    echo "  - TEST_EMAIL"
    echo "  - TEST_SUBDOMAIN" 
    echo "  - NGROK_URL"
    echo "  - THINKIFIC_CLIENT_ID"
    echo "  - THINKIFIC_CLIENT_SECRET"
    echo "  - DUITKU_TEST_API_KEY"
    echo "  - DUITKU_MERCHANT_CODE"
    exit 1
fi

echo "✅ Environment variables loaded"
echo "📧 Test Email: $TEST_EMAIL"
echo "🏫 Test Subdomain: $TEST_SUBDOMAIN"
echo "🌐 Ngrok URL: $NGROK_URL"

echo ""
echo "📋 TEST EXECUTION STEPS:"
echo "1. OAuth flow will be initiated"
echo "2. You will need to manually authorize in browser"
echo "3. Copy authorization code when prompted"
echo "4. Test will continue with real API calls"
echo "5. Payment URLs will be provided for manual testing"

echo ""
read -p "🤔 Are you ready to proceed? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Test cancelled"
    exit 1
fi

echo "🏃 Running E2E test..."
NODE_ENV=test npm run test:e2e-real
