const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Load environment variables based on NODE_ENV
if (process.env.NODE_ENV === 'test') {
  require('dotenv').config({ path: '.env.test' });
} else {
  require('dotenv').config();
}

const logger = require('./utils/logger.js');
const paymentRoutes = require('./routes/payment.js');
const webhookRoutes = require('./routes/webhooks.js');
const enrollmentRoutes = require('./routes/enrollment.js');
const oauthRoutes = require('./routes/oauth.js');
const settingsRoutes = require('./routes/settings.js');
const createApolloServer = require('../graphql');
const { expressMiddleware } = require('@apollo/server/express4');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

app.use(limiter);
app.use(morgan('combined', { stream: { write: message => logger.info(message) } }));
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

// Routes
app.use('/oauth', oauthRoutes);
app.use('/payment', paymentRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/enrollment', enrollmentRoutes);
app.use('/settings', settingsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
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

// Note: 404 handler is added after GraphQL setup in setupGraphQL()
const PORT = process.env.PORT || 3000;

// Initialize GraphQL immediately when module is loaded
let graphqlInitialized = false;
let graphqlPromise = null;

async function initializeGraphQL() {
  if (!graphqlInitialized && !graphqlPromise) {
    graphqlPromise = setupGraphQL().then(() => {
      graphqlInitialized = true;
    });
  }
  if (graphqlPromise) {
    await graphqlPromise;
  }
}

// Expose a function to wait for GraphQL initialization
app.waitForGraphQL = initializeGraphQL;

// Initialize GraphQL and start server
async function startServer() {
  try {
    await initializeGraphQL();
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`GraphQL playground available at http://localhost:${PORT}/graphql`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Initialize GraphQL when module is loaded (for tests)
if (process.env.NODE_ENV === 'test') {
  initializeGraphQL().catch(console.error);
}

// Only start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;