# Testing Guide for Duitku-Thinkific Integration

## How to Test This Integration

### 1. Unit Tests

```bash
npm test
```

### 2. Manual Testing Flow

#### A. Start the Server

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your API keys
# Start server
npm run dev
```

#### B. Test Payment Initiation

```bash
curl -X POST http://localhost:3000/api/payment/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "customerPhone": "+6281234567890",
    "amount": 100000,
    "courseName": "Web Development Course",
    "courseDescription": "Learn web development",
    "courseId": "123456",
    "paymentMethod": "02"
  }'
```

#### C. Test Webhook (Simulate Duitku Notification)

```bash
curl -X POST http://localhost:3000/api/webhooks/duitku \
  -H "Content-Type: application/json" \
  -d '{
    "merchantOrderId": "COURSE_1234567890_ABC123",
    "amount": "100000",
    "signature": "mock_signature",
    "resultCode": "00"
  }'
```

### 3. Integration Testing with Real Services

#### Prerequisites:

1. **Duitku Account**: Get sandbox credentials
2. **Thinkific Account**: Get API key
3. **Database**: PostgreSQL running
4. **Environment**: Set up .env file

#### Test Scenarios:

1. ✅ Payment initiation returns payment URL
2. ✅ Successful payment triggers Thinkific enrollment
3. ✅ Failed payment doesn't create enrollment
4. ✅ Duplicate webhooks are handled properly
5. ✅ Invalid signatures are rejected

### 4. Load Testing

```bash
npm install -g artillery
artillery run loadtest.yml
```

### 5. Security Testing

- Test webhook signature verification
- Test rate limiting
- Test input validation
- Test SQL injection protection
