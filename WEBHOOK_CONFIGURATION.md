# Webhook Configuration for Thinkific Integration

## Current Setup Status ✅

- **Server**: Running on port 3001
- **Redis**: Active and connected
- **Ngrok Tunnel**: Active and forwarding to port 3001
- **Public URL**: https://2694-180-243-2-236.ngrok-free.app

## Webhook Endpoints

### 1. Thinkific Webhook Endpoint

**URL for Thinkific Configuration:**

```
https://2694-180-243-2-236.ngrok-free.app/api/webhooks/thinkific
```

**Method:** POST
**Purpose:** Handles enrollment events from Thinkific
**Validation:** Includes Thinkific webhook signature validation

### 2. Duitku Payment Webhook Endpoint

**URL for Duitku Configuration:**

```
https://2694-180-243-2-236.ngrok-free.app/api/webhooks/duitku
```

**Method:** POST  
**Purpose:** Handles payment status updates from Duitku
**Validation:** Includes Duitku signature validation

## Health Check Endpoint

**URL:**

```
https://2694-180-243-2-236.ngrok-free.app/health
```

**Method:** GET
**Purpose:** Verify server connectivity

## Configuration Steps for Thinkific

1. **Login to your Thinkific Admin Panel**
2. **Navigate to Settings > Webhooks**
3. **Add New Webhook with these settings:**
   - **Webhook URL:** `https://2694-180-243-2-236.ngrok-free.app/api/webhooks/thinkific`
   - **Events to Subscribe:**
     - `enrollment.created`
     - `enrollment.updated`
     - `enrollment.deleted` (if needed)
   - **HTTP Method:** POST
   - **Content Type:** application/json

## Testing Your Webhooks

### Test Thinkific Webhook:

```bash
curl -X POST https://2694-180-243-2-236.ngrok-free.app/api/webhooks/thinkific \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'
```

### Test Duitku Webhook:

```bash
curl -X POST https://2694-180-243-2-236.ngrok-free.app/api/webhooks/duitku \
  -H "Content-Type: application/json" \
  -d '{"merchantOrderId": "test123", "resultCode": "00"}'
```

## Important Notes

⚠️ **Ngrok URL Changes**: The ngrok URL will change each time you restart ngrok. You'll need to update the webhook URLs in Thinkific if you restart ngrok.

💡 **For Production**: Replace the ngrok URL with your actual domain when deploying to production.

🔒 **Security**: Your webhook endpoints include validation middleware to verify incoming requests.

## Monitoring

- **Ngrok Web Interface**: http://localhost:4040
- **Server Logs**: Check console output for webhook processing
- **Redis Status**: Ensure Redis is running for queue processing

## Troubleshooting

If webhooks aren't working:

1. Check if ngrok tunnel is active: `curl -s http://localhost:4040/api/tunnels`
2. Verify server is running: `curl https://2694-180-243-2-236.ngrok-free.app/health`
3. Check server logs for any errors
4. Ensure Thinkific webhook configuration matches exactly

---

_Generated on: June 9, 2025_
_Ngrok URL: https://2694-180-243-2-236.ngrok-free.app_
