# Payment Flow Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Pays     │    │   Duitku API     │    │  Your Server    │
│  on Frontend    │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. POST /payment/     │                       │
         │    initiate           │                       │
         │──────────────────────────────────────────────▶│
         │                       │                       │
         │                       │                       │ 2. paymentController
         │                       │                       │    .initiatePayment()
         │                       │                       │
         │                       │ 3. Create payment     │
         │                       │    request            │
         │                       │◀──────────────────────│
         │                       │                       │
         │ 4. Return payment URL │                       │
         │◀──────────────────────────────────────────────│
         │                       │                       │
         │ 5. User completes     │                       │
         │    payment            │                       │
         │──────────────────────▶│                       │
         │                       │                       │
         │                       │ 6. Webhook callback   │
         │                       │──────────────────────▶│
         │                       │                       │
         │                       │                       │ 7. handleDuitkuWebhook()
         │                       │                       │    - Verify signature
         │                       │                       │    - Check payment status
         │                       │                       │
         │                       │                       │ 8. IF SUCCESS:
         │                       │                       │    processSuccessfulPayment()
         │                       │                       │
         │                       │                       │ 9. EnrollmentController
         │                       │                       │    .processEnrollment()
         │                       │                       │
┌─────────────────┐                                       │
│ Thinkific API   │                                       │
│                 │                                       │
└─────────────────┘                                       │
         │                                                │
         │ 10. Create/Find User                          │
         │◀──────────────────────────────────────────────│
         │                                                │
         │ 11. Enroll User in Course                     │
         │◀──────────────────────────────────────────────│
         │                                                │
         │ 12. Return enrollment data                     │
         │──────────────────────────────────────────────▶│
         │                                                │
         │                                                │ 13. Save enrollment
         │                                                │     to database
         │                                                │
         │                                                │ 14. Update payment
         │                                                │     status to 'completed'
```

## Key Components:

### 1. Payment Initiation

- **File**: `/src/routes/payment.js` → `/src/controllers/paymentController.js`
- **Action**: Store customer data, create Duitku payment
- **Storage**: Redis cache for customer data

### 2. Webhook Processing

- **File**: `/src/controllers/webhookController.js`
- **Method**: `handleDuitkuWebhook()` → `processSuccessfulPayment()`
- **Action**: Verify payment, trigger enrollment

### 3. **ENROLLMENT HAPPENS HERE** 🎯

- **File**: `/src/controllers/enrollmentController.js`
- **Method**: `processEnrollment(paymentData, customerData)`
- **Steps**:
  1. Create Thinkific user via `thinkificService.createUser()`
  2. Map course name to ID via `mapCourseNameToId()`
  3. **Enroll user** via `thinkificService.enrollUser(courseId, userId)`
  4. Save enrollment record via `dataStore.saveEnrollment()`

### 4. Thinkific Integration

- **File**: `/src/services/thinkificServices.js`
- **Methods**:
  - `createUser()` - Creates/finds user in Thinkific
  - `enrollUser()` - **ACTUAL ENROLLMENT CALL** to Thinkific API
  - `getCourses()` - Fetch available courses

## Alternative Flow (Webhook Service)

There's also a secondary path via `/src/services/webhookService.js`:

- `triggerEnrollment()` → Queue processing
- This appears to be for more complex scenarios

## Current Status:

✅ Payment flow is complete and functional
✅ Enrollment logic is implemented
❌ **OAuth issue prevents testing** - need to fix redirect URI
❌ Course mapping needs real Thinkific course IDs
