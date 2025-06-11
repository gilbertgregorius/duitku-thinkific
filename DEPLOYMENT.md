# Deployment Guide - Duitku-Thinkific Partner App

This guide walks you through deploying your Duitku-Thinkific Partner App from development to production.

## 🚀 Quick Deployment Checklist

### Phase 1: Thinkific Partner App Submission

- [ ] Complete app development and testing
- [ ] Submit to Thinkific Partner Portal
- [ ] Get OAuth credentials approved
- [ ] Update production URLs

### Phase 2: Production Deployment

- [ ] Set up production hosting
- [ ] Configure environment variables
- [ ] Deploy backend and frontend
- [ ] Set up database and Redis
- [ ] Configure webhooks
- [ ] Test end-to-end integration

## 📋 Step-by-Step Deployment

### 1. Submit to Thinkific Partner Portal

#### A. Create Your Partner App

1. Go to [Thinkific Partner Portal](https://partner.thinkific.com/apps/create)
2. Fill in the application form:

```
App Name: Duitku Payment Integration
Description: Seamless Indonesian payment processing with automatic course enrollment through Duitku's comprehensive payment gateway solutions.

Category: Payment & Billing
Subcategory: Payment Processing

App Icon: Upload your app icon (256x256px)
Screenshots: Add 3-5 screenshots of your app interface

Redirect URI: https://your-production-domain.com/oauth/callback
Webhook URL: https://your-production-domain.com/webhooks/thinkific

Scopes:
- openid (for OAuth)
- courses:read
- enrollments:write
- users:read
- users:write

Support Email: your-support@example.com
Privacy Policy URL: https://your-domain.com/privacy
Terms of Service URL: https://your-domain.com/terms
```

#### B. App Submission Requirements

Create these required documents:

**Privacy Policy** (privacy-policy.md):

```markdown
# Privacy Policy - Duitku Payment Integration

## Data Collection

We collect minimal user data necessary for payment processing and course enrollment:

- Email addresses for course enrollment
- Payment transaction data (encrypted)
- Course enrollment status

## Data Usage

- Payment processing through Duitku
- Automatic course enrollment in Thinkific
- Transaction history and reporting

## Data Security

- All payment data encrypted in transit and at rest
- No storage of sensitive payment information
- Compliance with Indonesian data protection regulations

## Third-Party Services

- Duitku (payment processing)
- Thinkific (course management)

Contact: privacy@your-domain.com
```

**Terms of Service** (terms-of-service.md):

```markdown
# Terms of Service - Duitku Payment Integration

## Service Description

This application provides payment processing services for Thinkific courses using Duitku's payment gateway.

## User Responsibilities

- Provide accurate payment information
- Comply with course enrollment terms
- Use service for legitimate educational purposes

## Service Availability

- 99.9% uptime SLA
- 24/7 payment processing
- Customer support during business hours

## Limitation of Liability

Standard limitation clauses for software services.

Contact: legal@your-domain.com
```

### 2. Production Hosting Setup

#### A. Choose Your Hosting Platform

Recommended options:

- **Railway**: Easy deployment, good for Node.js
- **Heroku**: Established platform, easy setup
- **DigitalOcean App Platform**: Cost-effective, flexible
- **AWS Elastic Beanstalk**: Enterprise-grade, scalable

#### B. Environment Configuration

**Production .env template**:

```env
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@host:5432/database
DB_SSL=true

# Redis
REDIS_URL=redis://redis-host:6379

# Duitku Production
DUITKU_MERCHANT_CODE=your_production_merchant_code
DUITKU_API_KEY=your_production_api_key
DUITKU_ENVIRONMENT=production

# Thinkific Production OAuth
THINKIFIC_CLIENT_ID=your_production_client_id
THINKIFIC_CLIENT_SECRET=your_production_client_secret

# Production URLs
APP_BASE_URL=https://your-production-domain.com/
FRONTEND_URL=https://your-app-domain.com

# Security
JWT_SECRET=your_super_secure_jwt_secret_here
WEBHOOK_SECRET=your_webhook_secret_here

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=your_sentry_dsn_for_error_tracking

# CORS
ALLOWED_ORIGINS=https://your-app-domain.com,https://your-school.thinkific.com
```

### 3. Database Setup

#### A. PostgreSQL Production Setup

```sql
-- Create production database
CREATE DATABASE duitku_thinkific_prod;

-- Create user
CREATE USER duitku_app WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE duitku_thinkific_prod TO duitku_app;

-- Enable SSL
ALTER DATABASE duitku_thinkific_prod SET ssl = on;
```

#### B. Run Migrations

```bash
# On production server
NODE_ENV=production npm run migrate
```

### 4. Deployment Scripts

#### A. Backend Deployment (package.json)

```json
{
  "scripts": {
    "build": "echo 'No build step needed for Node.js'",
    "start": "node src/app.js",
    "start:prod": "NODE_ENV=production node src/app.js",
    "migrate:prod": "NODE_ENV=production npm run migrate",
    "deploy": "npm install --production && npm run migrate:prod"
  }
}
```

#### B. Frontend Deployment

```bash
# Build React app for production
cd frontend
REACT_APP_API_URL=https://your-api-domain.com npm run build

# Serve built files (using nginx or similar)
# Copy build/ folder to your web server
```

#### C. Nginx Configuration

```nginx
# /etc/nginx/sites-available/duitku-thinkific
server {
    listen 80;
    server_name your-app-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-app-domain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # Frontend (React app)
    location / {
        root /var/www/duitku-thinkific/build;
        try_files $uri $uri/ /index.html;
    }

    # API proxy to backend
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # OAuth endpoints
    location /oauth/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Webhooks
    location /webhooks/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5. Production Checklist

#### A. Security

- [ ] SSL certificates installed and configured
- [ ] Environment variables secured (not in code)
- [ ] Database credentials rotated
- [ ] API keys are production keys
- [ ] CORS configured for production domains only
- [ ] Rate limiting enabled
- [ ] Webhook signatures validated

#### B. Monitoring

- [ ] Error tracking (Sentry/Bugsnag)
- [ ] Application monitoring (New Relic/DataDog)
- [ ] Database monitoring
- [ ] Server monitoring
- [ ] Log aggregation (ELK/Splunk)

#### C. Performance

- [ ] Database indexes optimized
- [ ] API response caching
- [ ] CDN for static assets
- [ ] Database connection pooling
- [ ] Redis for session storage

#### D. Testing

- [ ] OAuth flow works end-to-end
- [ ] Payment processing works
- [ ] Webhooks receive and process correctly
- [ ] Course enrollment happens automatically
- [ ] Error handling works properly

### 6. Go-Live Process

#### A. Pre-Launch

1. **Soft Launch**: Deploy to staging environment
2. **Testing**: Run full integration tests
3. **Performance**: Load test with expected traffic
4. **Security**: Security audit and penetration testing

#### B. Launch Day

1. **DNS**: Point domain to production servers
2. **Monitoring**: Enable all monitoring systems
3. **Communication**: Notify stakeholders
4. **Support**: Have support team ready

#### C. Post-Launch

1. **Monitor**: Watch for errors and performance issues
2. **Feedback**: Collect user feedback
3. **Iterate**: Make improvements based on real usage
4. **Scale**: Prepare for growth

### 7. Maintenance

#### A. Regular Tasks

- **Weekly**: Review error logs and performance metrics
- **Monthly**: Security updates and dependency updates
- **Quarterly**: Performance optimization review
- **Annually**: Security audit and compliance review

#### B. Backup Strategy

- **Database**: Daily automated backups with 30-day retention
- **Application**: Version control and deployment rollback capability
- **Configuration**: Environment variable backups
- **Monitoring**: Backup monitoring and alerting configurations

### 8. Support & Documentation

#### A. User Documentation

- Create user guide for Thinkific school owners
- Video tutorials for setup and configuration
- FAQ for common issues
- Troubleshooting guides

#### B. Developer Documentation

- API documentation (already created)
- Integration guides
- Webhook documentation
- Error code references

## 🆘 Troubleshooting Common Issues

### OAuth Issues

- Verify redirect URIs match exactly
- Check client ID and secret
- Ensure HTTPS for production

### Payment Issues

- Verify Duitku credentials
- Check webhook URLs are accessible
- Validate webhook signatures

### Enrollment Issues

- Verify Thinkific API permissions
- Check course IDs and user IDs
- Monitor webhook processing

## 📞 Support Contacts

- **Technical Issues**: tech-support@your-domain.com
- **Business Issues**: business@your-domain.com
- **Security Issues**: security@your-domain.com

---

This deployment guide ensures a smooth transition from development to production for your Duitku-Thinkific Partner App.
