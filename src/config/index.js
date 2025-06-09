module.exports = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'course_enrollment',
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
  },
  duitku: {
    merchantCode: process.env.DUITKU_MERCHANT_CODE,
    apiKey: process.env.DUITKU_API_KEY,
    environment: process.env.DUITKU_ENVIRONMENT || 'sandbox'
  },
  thinkific: {
    apiKey: process.env.THINKIFIC_API_KEY,
    subdomain: process.env.THINKIFIC_SUBDOMAIN
  },
  app: {
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
    logLevel: process.env.LOG_LEVEL || 'info'
  }
};