# Thinkific Integration Guide

## Integration Options

### Option 1: Direct API Integration (Current)
Perfect for custom websites wanting to add course sales.

**User Implementation:**
```javascript
// On user's website
const response = await fetch('https://your-api.com/api/payment/initiate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    courseName: "React Course",
    coursePrice: 250000,
    customerName: "John Doe",
    customerEmail: "john@example.com",
    customerPhone: "+6281234567890",
    paymentMethod: "VA",
    returnUrl: "https://yoursite.com/success",
    callbackUrl: "https://yoursite.com/payment-callback"
  })
});

const { paymentUrl, orderId } = await response.json();
// Redirect user to paymentUrl
```

**Benefits:**
- ✅ Full control over payment flow
- ✅ Custom checkout experience
- ✅ No Thinkific dependency for payment UI

### Option 2: Thinkific Webhook Integration (Future)
For users who want payments triggered from Thinkific checkout.

**Required webhooks:**
- `order.created` - When user starts checkout in Thinkific
- `order.updated` - When payment status changes
- `enrollment.created` - Confirm enrollment worked

**User Implementation:**
1. Install your app in Thinkific
2. Configure webhook endpoints
3. Set payment gateway to "Custom Gateway"

### Option 3: Embedded Widget (Future)
JavaScript widget that can be embedded anywhere.

```html
<script src="https://your-api.com/widget.js"></script>
<div id="duitku-payment" data-course="react-course"></div>
```

## Current MVP Recommendation

**Start with Option 1** (Direct API) because:
- ✅ Simpler to implement
- ✅ More flexible for users
- ✅ No Thinkific app approval needed
- ✅ Works with any website/platform

## Required Thinkific Setup for Users

Users need to configure in their Thinkific admin:
1. **API Key** - For enrollment API calls
2. **Course IDs** - Which courses to sell
3. **Webhook URL** (optional) - For enrollment confirmations

That's it! No complex Thinkific app installation needed.
