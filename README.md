# Duitku-Thinkific Partner App

A comprehensive integration that connects Duitku payment processing with Thinkific's course platform, enabling seamless payment handling and automatic course enrollment.

## 🌟 Features

- **OAuth 2.0 Integration**: Complete OAuth flow with PKCE for secure Thinkific integration
- **Payment Processing**: Seamless Duitku payment handling with multiple Indonesian payment methods
- **Automatic Enrollment**: Students are automatically enrolled in Thinkific courses upon successful payment
- **Real-time Webhooks**: Handle payment callbacks and course enrollment events
- **Modern Dashboard**: React-based admin interface for managing orders and enrollments
- **Comprehensive API**: RESTful API with full documentation
- **Security**: Rate limiting, CORS protection, and secure webhook validation

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   React Frontend │◄──►│  Express API    │◄──►│   Thinkific     │
│   (Port 3001)   │    │   (Port 3000)   │    │     OAuth       │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │                 │
                       │   Duitku API    │
                       │   Payments      │
                       │                 │
                       └─────────────────┘
```

## 🚀 Quick Start

### 1. Setup
```bash
# Clone and setup
git clone <your-repo-url>
cd duitku-thinkific
chmod +x setup.sh
./setup.sh
```

### 2. Configure Environment
Update `.env` with your credentials:
```env
# Duitku Configuration
DUITKU_MERCHANT_CODE=your_merchant_code
DUITKU_API_KEY=your_api_key
DUITKU_ENVIRONMENT=sandbox

# Thinkific OAuth (get from partner portal)
THINKIFIC_CLIENT_ID=your_client_id
THINKIFIC_CLIENT_SECRET=your_client_secret

# App URL (ngrok for development)
APP_BASE_URL=https://your-ngrok-url.ngrok-free.app/
```

### 3. Run Development Servers
```bash
# Backend only
npm run dev

# Frontend only
npm run frontend

# Both together
npm run dev:full
```

### 4. Access the Application
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/health

## 📋 Thinkific Partner App Setup

### 1. Create Partner App
1. Visit [Thinkific Partner Portal](https://partner.thinkific.com/apps/create)
2. Fill in app details:
   - **App Name**: Duitku Payment Integration
   - **Description**: Seamless Indonesian payment processing with automatic course enrollment
   - **Category**: Payment & Billing
   - **Redirect URI**: `https://your-ngrok-url.ngrok-free.app/oauth/callback`

### 2. Configure Webhooks
In your Thinkific admin panel, add webhook URLs:
- **Order Completed**: `https://your-ngrok-url.ngrok-free.app/webhooks/thinkific`
- **Enrollment Events**: `https://your-ngrok-url.ngrok-free.app/webhooks/thinkific`

### 3. Update Environment
Replace OAuth credentials in `.env` with actual values from Partner Portal.

## 🛠️ API Endpoints

### OAuth Endpoints
- `GET /oauth/install?subdomain=school` - Initiate OAuth flow
- `GET /oauth/callback` - OAuth callback handler
- `GET /oauth/status/:subdomain` - Check connection status
- `POST /oauth/revoke` - Revoke OAuth connection

### Payment & Orders
- `GET /orders` - List all orders with filtering
- `GET /orders/:id` - Get specific order
- `PUT /orders/:id` - Update order status
- `DELETE /orders/:id` - Delete order

### Enrollments
- `GET /enrollments` - List all enrollments
- `PUT /enrollments/:id` - Update enrollment
- `DELETE /enrollments/:id` - Remove enrollment

### Webhooks
- `POST /webhooks/duitku/callback` - Duitku payment callback
- `POST /webhooks/thinkific` - Thinkific event webhook

## 🔧 Development

### Project Structure
```
duitku-thinkific/
├── src/                    # Backend source
│   ├── routes/            # API routes
│   ├── controllers/       # Business logic
│   ├── services/         # External API services
│   ├── middleware/       # Express middleware
│   └── utils/           # Utilities
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/       # Page components
│   │   └── services/    # API client
│   └── public/
├── tests/                # Test files
└── documentation.md      # API documentation
```

### Available Scripts
```bash
npm run dev              # Start backend in development
npm run frontend         # Start React frontend
npm run dev:full         # Start both backend and frontend
npm run test             # Run tests
npm run setup            # Initial setup
```

### Testing
```bash
# Backend tests
npm test

# Test payment flow
node tests/test.js

# Test webhook integration
node tests/integration.test.js
```

## 🔐 Security

- **OAuth 2.0 with PKCE**: Secure authorization flow
- **Rate Limiting**: Prevent abuse with request limits
- **CORS Protection**: Configured allowed origins
- **Webhook Validation**: Verify webhook signatures
- **Environment Variables**: Secure credential storage

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

### Logs
- `logs/combined.log` - All application logs
- `logs/error.log` - Error logs only

## 🌐 Deployment

### Production Checklist
- [ ] Update OAuth redirect URLs to production domain
- [ ] Set `DUITKU_ENVIRONMENT=production`
- [ ] Configure proper database (PostgreSQL)
- [ ] Set up Redis for session storage
- [ ] Configure SSL certificates
- [ ] Set up monitoring and logging
- [ ] Test all webhook endpoints

### Environment Variables (Production)
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://redis-host:6379
APP_BASE_URL=https://your-production-domain.com/
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📖 Documentation

- [API Documentation](./documentation.md)
- [Thinkific OAuth API](./THINKIFIC_OAUTH_API.md)
- [Thinkific Admin API](./THINKIFIC_ADMIN_API.md)
- [Thinkific Webhook API](./THINKIFIC_WEBHOOK_API.md)

## 🆘 Support

- **Issues**: Create GitHub issues for bugs
- **Questions**: Use GitHub Discussions
- **Email**: your-support-email@example.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ for seamless Indonesian payment processing and course enrollment automation.
