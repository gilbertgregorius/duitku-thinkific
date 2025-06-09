const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger.js');
const config = require('./config/index.js');
const paymentRoutes = require('./routes/payment.js');
const webhookRoutes = require('./routes/webhooks.js');
const enrollmentRoutes = require('./routes/enrollment.js');

const app = express();

// Serve static files
app.use(express.static('public'));

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use(limiter);

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message) } }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/payment', paymentRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/enrollment', enrollmentRoutes);

// Add courses endpoint for the frontend
app.get('/api/courses', async (req, res) => {
  try {
    const ThinkificService = require('./services/thinkificServices');
    const thinkificService = new ThinkificService(require('./config').thinkific);
    
    // Try to fetch real courses from Thinkific
    const coursesData = await thinkificService.getCourses();
    
    if (coursesData && coursesData.items) {
      // Return real courses with pricing info
      const courses = coursesData.items.map(course => ({
        id: course.id,
        name: course.name,
        description: course.description,
        price: course.price || 100000, // Default price if not set
        currency: 'IDR'
      }));
      res.json(courses);
    } else {
      // Fallback to mock courses
      res.json([
        { id: 123456, name: "Web Development Fundamentals", price: 100000, currency: "IDR" },
        { id: 123457, name: "Advanced JavaScript", price: 150000, currency: "IDR" },
        { id: 123458, name: "React Masterclass", price: 200000, currency: "IDR" }
      ]);
    }
  } catch (error) {
    console.error('Error fetching courses:', error);
    // Return mock courses as fallback
    res.json([
      { id: 123456, name: "Web Development Fundamentals", price: 100000, currency: "IDR" },
      { id: 123457, name: "Advanced JavaScript", price: 150000, currency: "IDR" },
      { id: 123458, name: "React Masterclass", price: 200000, currency: "IDR" }
    ]);
  }
});

// Debug endpoint to check configuration (remove in production)
app.get('/api/debug-config', (req, res) => {
  const config = require('./config');
  res.json({
    duitku: {
      merchantCode: config.duitku.merchantCode ? `${config.duitku.merchantCode.substring(0,3)}***` : 'NOT_SET',
      apiKey: config.duitku.apiKey ? `${config.duitku.apiKey.substring(0,8)}***` : 'NOT_SET',
      environment: config.duitku.environment
    },
    thinkific: {
      apiKey: config.thinkific.apiKey ? `${config.thinkific.apiKey.substring(0,8)}***` : 'NOT_SET',
      subdomain: config.thinkific.subdomain
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = app;