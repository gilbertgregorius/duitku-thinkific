const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const logger = require('./utils/logger.js');
const config = require('./config/index.js');
const paymentRoutes = require('./routes/payment.js');
const webhookRoutes = require('./routes/webhooks.js');
const enrollmentRoutes = require('./routes/enrollment.js');
const oauthRoutes = require('./routes/oauth.js');
const settingsRoutes = require('./routes/settings.js');
const newRoutes = require('./routes/new.js');

// GraphQL setup
const createApolloServer = require('../graphql');
const { expressMiddleware } = require('@apollo/server/express4');

const app = express();

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

// View engine setup for EJS (for payment pages)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup GraphQL server
async function setupGraphQL() {
  const server = createApolloServer();
  await server.start();
  
  app.use('/graphql', 
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        // Add authentication context if needed
        return {
          user: req.user,
          headers: req.headers
        };
      },
    })
  );
  
  logger.info('GraphQL server started at /graphql');
}

// Routes
app.use('/api/payment', paymentRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/enrollment', enrollmentRoutes);
app.use('/oauth', oauthRoutes);
app.use('/settings', settingsRoutes);
app.use('/orders', require('./routes/orders.js'));
app.use('/enrollments', enrollmentRoutes);

// New Thinkific integration routes
app.use('/payment', newRoutes);

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

// Initialize GraphQL and start server
async function startServer() {
  try {
    await setupGraphQL();
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`GraphQL playground available at http://localhost:${PORT}/graphql`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;