# E2E Testing with Real APIs

This document explains how to run End-to-End tests using **real APIs only** - no mocks, no fallbacks.

## Prerequisites

### 1. Environment Setup

```bash
# Copy and edit the test environment file
cp .env.test.example .env.test
```

### 2. Required Real Credentials

Update `.env.test` with your **real** credentials:

```bash
# Your real email for testing
TEST_EMAIL=your-real-email@example.com

# Your Thinkific subdomain
TEST_SUBDOMAIN=your-subdomain

# Real Thinkific OAuth credentials
THINKIFIC_CLIENT_ID=your_real_client_id
THINKIFIC_CLIENT_SECRET=your_real_client_secret

# Real Duitku test credentials
DUITKU_TEST_API_KEY=your_real_test_api_key
DUITKU_MERCHANT_CODE=your_real_merchant_code

# Your current ngrok URL
NGROK_URL=https://your-ngrok-url.ngrok-free.app
```

### 3. Start ngrok

```bash
# Start ngrok (already done)
ngrok http 3000

# Update NGROK_URL in .env.test with the HTTPS URL
```

### 4. Database Setup

```bash
# Create test database
createdb duitku_thinkific_test

# Update database credentials in .env.test
```

## Running the E2E Test

### Method 1: Using the Test Runner Script (Recommended)

```bash
chmod +x run-e2e-real.sh
./run-e2e-real.sh
```

### Method 2: Direct npm command

```bash
npm run test:e2e-real
```

## Test Flow & Manual Steps Required

The E2E test is **interactive** and requires manual intervention at specific points:

### Step 0: OAuth Flow

1. **Test generates OAuth URL** → displayed in console
2. **YOU MANUALLY**: Visit the URL in browser
3. **YOU MANUALLY**: Complete Thinkific authorization
4. **YOU MANUALLY**: Copy the `code` parameter from callback URL
5. **YOU MANUALLY**: Paste the code when prompted in test console
6. **Test continues**: Exchanges code for access token

### Step 1: User Management

- ✅ Automatic: Creates/verifies user in database
- ✅ Automatic: Tests GraphQL user queries

### Step 2: Course Fetching

- ✅ Automatic: Fetches **real courses** from Thinkific API
- ✅ Automatic: Uses first available course for testing
- ✅ Automatic: Tests GraphQL course queries

### Step 3: Payment Flow

- ✅ Automatic: Renders checkout page with real course data
- ✅ Automatic: Creates **real payment** with Duitku API
- 📄 **OUTPUT**: Real payment URL for manual testing
- ✅ Automatic: Tests GraphQL payment mutations

### Step 4: Webhook Testing

- ✅ Automatic: Simulates Duitku webhook callbacks
- ✅ Automatic: Simulates Thinkific enrollment webhooks
- 🌐 **REAL**: Webhooks will hit your ngrok URL

### Step 5: Verification

- ✅ Automatic: Verifies payment records in database
- ✅ Automatic: Checks enrollment data

## Expected Outputs

### Console Output Example:

```
🚀 Starting E2E Tests with Real APIs
✅ Test database initialized

Step 0: OAuth Flow - Get Real Access Token
  ✅ OAuth authorization URL generated
  🔗 Manual step required: Visit this URL to authorize:
  https://app.thinkific.com/oauth/authorize?client_id=...
  📝 After authorization, copy the authorization code from the callback URL

🔐 MANUAL OAUTH REQUIRED
======================================
1. Visit the OAuth URL from the previous test
2. Complete the authorization process
3. Copy the "code" parameter from the callback URL
4. Paste it below when prompted
======================================

Enter the authorization code from OAuth callback: [WAITING FOR INPUT]
```

### Real Payment URL Output:

```
✅ Payment created successfully with Duitku
🧾 Order ID: ORDER-1640123456789-ABC123DEF
💰 Payment URL: https://sandbox.duitku.com/checkout/...
🔗 Visit this URL to complete payment: https://sandbox.duitku.com/checkout/...
```

## What This Test Does NOT Do

❌ **No Mocks**: No fake tokens, no mock APIs
❌ **No Fallbacks**: If OAuth fails, test fails
❌ **No Dummy Data**: Uses real courses, real payments
❌ **No Auto-Payment**: You must manually complete payments

## What This Test DOES Do

✅ **Real OAuth**: Actual Thinkific authorization flow
✅ **Real APIs**: Actual Thinkific & Duitku API calls  
✅ **Real Database**: Actual PostgreSQL operations
✅ **Real Webhooks**: Actual callbacks to your ngrok URL
✅ **Real Payments**: Actual Duitku payment URLs (sandbox)
✅ **Real Courses**: Fetches actual courses from your Thinkific school

## Troubleshooting

### OAuth Issues

```bash
# If OAuth fails
Error: ❌ Authorization code is required to continue the test
```

**Solution**: Make sure you complete the browser authorization and copy the exact `code` parameter.

### API Issues

```bash
# If Thinkific API fails
Error: Request failed with status code 401
```

**Solution**: Check your `THINKIFIC_CLIENT_ID` and `THINKIFIC_CLIENT_SECRET`.

### Payment Issues

```bash
# If Duitku API fails
Error: Payment initiation failed
```

**Solution**: Check your `DUITKU_TEST_API_KEY` and `DUITKU_MERCHANT_CODE`.

### Database Issues

```bash
# If database connection fails
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**: Start PostgreSQL and create the test database.

## Manual Testing After E2E

After the E2E test completes:

1. **Visit Payment URL**: Complete the payment manually
2. **Check ngrok**: Verify webhooks are received
3. **Check Database**: Verify payment status updates
4. **Check Thinkific**: Verify user enrollment

## Test Results Interpretation

### ✅ SUCCESS: All steps pass

- OAuth completed successfully
- Real course data fetched
- Real payment created
- Database operations working
- Ready for manual payment completion

### ❌ FAILURE: Test stops at first real issue

- OAuth credentials invalid → Fix credentials
- API permissions missing → Check API access
- Network issues → Check connectivity
- Database issues → Check PostgreSQL

This approach ensures you're testing the **real integration** with **real data** in a **real environment**.
