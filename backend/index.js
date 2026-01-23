const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const session = require('express-session');
require('dotenv').config();

// Validate required environment variables on startup
const requiredEnvVars = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('\x1b[31m%s\x1b[0m', '❌ ERROR: Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error('\x1b[31m%s\x1b[0m', `   - ${varName}`);
  });
  console.error('\x1b[33m%s\x1b[0m', '\nPlease configure these variables in your .env file before starting the server.');
  process.exit(1);
}

const { connectDB, closePool } = require('./config/database');
const logger = require('./config/logger');
const { corsOptions, helmetOptions, generalLimiter } = require('./config/security');
const sessionConfig = require('./config/session');
const { validateSession, trackSessionActivity } = require('./middleware/sessionValidation');
const createTables = require('./scripts/createTables');
const createCartTable = require('./scripts/createCartTable');
const createStoresTable = require('./scripts/createStoresTable');
const createOrdersTable = require('./scripts/createOrdersTable');
const updateOrdersTableForCheckout = require('./scripts/updateOrdersTableForCheckout');
const addDeliveryFieldsToOrders = require('./scripts/addDeliveryFieldsToOrders');
const addStripeConnectToStores = require('./scripts/addStripeConnectToStores');
const addPasswordResetFields = require('./scripts/addPasswordResetFields');
const createFailedTransfersTable = require('./scripts/createFailedTransfersTable');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for production deployment (behind load balancer/proxy)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  
  // Force HTTPS in production
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
    next();
  });

  // Additional production security headers
  app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });
}

// Security middleware
app.use(helmet(helmetOptions));
app.use(cors(corsOptions));
app.use(compression());
app.use(generalLimiter);

// Session middleware
app.use(session(sessionConfig));

// Session validation and activity tracking
app.use(validateSession({
  maxSessions: 5,
  enforceLimit: true,
  checkUserStatus: true
}));
app.use(trackSessionActivity());

// Request logging
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: {
    write: (message) => logger.http(message.trim())
  }
}));

// Webhook routes (must be before body parsing middleware for raw body access)
const webhookRoutes = require('./routes/webhooks');
app.use('/api/webhooks', webhookRoutes);

// Body parsing middleware with size limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/', (req, res) => {
  res.json({ message: 'Afrozy Market API is running!' });
});

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
  const healthcheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    memory: process.memoryUsage()
  };

  try {
    // Check database connection with timeout and retry
    const { pool } = require('./config/database');
    let client;
    
    try {
      client = await Promise.race([
        pool.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database connection timeout')), 3000)
        )
      ]);
      
      await Promise.race([
        client.query('SELECT 1'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 2000)
        )
      ]);
      
      healthcheck.database = 'connected';
      healthcheck.pool = {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
      };
    } finally {
      if (client) client.release();
    }
  } catch (error) {
    healthcheck.database = 'disconnected';
    healthcheck.status = 'ERROR';
    healthcheck.error = error.message;
    logger.error('Health check database error:', error);
  }

  const statusCode = healthcheck.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(healthcheck);
});

// API version endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Afrozy Market API',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Products routes
const productRoutes = require('./routes/products');
app.use('/api/products', productRoutes);

// Admin routes
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Authentication routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Cart routes
const cartRoutes = require('./routes/cart');
app.use('/api/cart', cartRoutes);

// Notifications routes
const notificationRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationRoutes);

// Orders routes
const orderRoutes = require('./routes/orders');
app.use('/api/orders', orderRoutes);

// Driver routes
const driverRoutes = require('./routes/drivers');
app.use('/api/drivers', driverRoutes);

// Store routes
const storeRoutes = require('./routes/store');
app.use('/api/store', storeRoutes);

// Image upload routes
const imageRoutes = require('./routes/images');
app.use('/api/images', imageRoutes);

// Checkout routes
const checkoutRoutes = require('./routes/checkout');
app.use('/api/checkout', checkoutRoutes);

// Stripe Connect routes
const stripeConnectRoutes = require('./routes/stripe-connect');
app.use('/api/stripe-connect', stripeConnectRoutes);

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(err.status || 500).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Handle 404 routes
app.use((req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    logger.info('Database connected successfully');

    // Initialize database tables
    await createTables();
    await createCartTable();
    await createStoresTable();
    await createOrdersTable();
    await updateOrdersTableForCheckout();
    await addDeliveryFieldsToOrders();
    await addStripeConnectToStores();
    await addPasswordResetFields();
    await createFailedTransfersTable();
    logger.info('Database tables initialized');

    // Check R2 configuration
    const r2Service = require('./config/r2');
    const r2Configured = r2Service.isConfigured();
    if (r2Configured) {
      logger.info('✅ Cloudflare R2 storage configured and ready');
    } else {
      logger.warn('⚠️ Cloudflare R2 storage not configured - image uploads will fail');
    }

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Afrozy Market API running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      logger.info(`📍 Health check available at http://localhost:${PORT}/health`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        logger.info('HTTP server closed');
        try {
          await closePool();
          logger.info('Database connections closed');
        } catch (error) {
          logger.error('Error closing database:', error);
        }
        logger.info('Graceful shutdown completed');
        process.exit(0);
      });
      
      // Force exit after 15 seconds
      setTimeout(() => {
        logger.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 15000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();