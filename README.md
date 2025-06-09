# Duitku-Thinkific Integration Plugin

## Overview

Official middleware/plugin for integrating Duitku payment gateway with Thinkific online learning platform.

## Features

- ✅ Seamless payment processing with Duitku
- ✅ Automatic user enrollment in Thinkific courses
- ✅ Webhook handling for payment notifications
- ✅ Multi-payment method support (Bank Transfer, E-wallet, etc.)
- ✅ Transaction logging and audit trail
- ✅ Production-ready with security features

## Installation

### Prerequisites

- Node.js 16+
- PostgreSQL 12+
- Redis (optional, for queues)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/duitku/duitku-thinkific-plugin.git
cd duitku-thinkific-plugin

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run database migrations
npm run migrate

# Start the server
npm start
```

## Configuration

### Duitku Setup

1. Register at [Duitku](https://duitku.com)
2. Get your Merchant Code and API Key
3. Set up callback URL: `https://yourdomain.com/api/webhooks/duitku`

### Thinkific Setup

1. Get your Thinkific API key from Settings > Code & Analytics > API
2. Note your subdomain (e.g., `yourschool.thinkific.com`)

## API Endpoints

### Payment Initiation

```
POST /api/payment/initiate
```

### Webhook Endpoints

```
POST /api/webhooks/duitku     # Duitku payment notifications
POST /api/webhooks/thinkific  # Thinkific events (optional)
```

## Testing

```bash
npm test
```

## Deployment

Use Docker:

```bash
docker-compose up -d
```

## License

MIT License - see LICENSE file

## Support

- GitHub Issues: [Report bugs here]
- Documentation: [Link to docs]
- Email: support@duitku.com
