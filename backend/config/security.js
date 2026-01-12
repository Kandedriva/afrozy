const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Rate limiting configuration
const createRateLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: {
    success: false,
    message: message || 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General rate limiter
const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again later.'
);

// Auth rate limiter (more strict)
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 requests per windowMs
  'Too many authentication attempts, please try again later.'
);

// API rate limiter
const apiLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  200, // limit each IP to 200 requests per windowMs
  'Too many API requests from this IP, please try again later.'
);

// Strict rate limiter for sensitive endpoints
const strictAuthLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  3, // limit each IP to 3 attempts per windowMs
  'Too many authentication attempts. Please wait before trying again.'
);

// Upload rate limiter
const uploadLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  5, // 5 uploads per minute
  'Too many upload attempts. Please wait before uploading again.'
);

// Store management operations limiter
const storeManagementLimiter = createRateLimiter(
  5 * 60 * 1000, // 5 minutes
  50, // 50 operations per 5 minutes
  'Too many store operations. Please slow down.'
);

// Helmet configuration with enhanced CSP for production
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://afrozy.com", "https://jamaamarket.com", "https://images.jamaamarket.com", "https://*.cloudflarestorage.com"],
      scriptSrc: process.env.NODE_ENV === 'production' 
        ? ["'self'"] 
        : ["'self'", "'unsafe-eval'"], // Allow eval in development for React
      connectSrc: process.env.NODE_ENV === 'production'
        ? ["'self'", "https://api.stripe.com", "https://api.afrozy.com", "https://api.jamaamarket.com", "wss://afrozy.com", "wss://jamaamarket.com"]
        : ["'self'", "https://localhost:3001", "https://api.stripe.com", "wss://localhost:3000"],
      frameSrc: ["https://js.stripe.com", "https://hooks.stripe.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true
  }
};

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin in development and for health checks
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      // Production domains - Afrozy
      'https://afrozy.com',
      'https://www.afrozy.com',
      'https://api.afrozy.com',
      // Legacy domains - Jamaa Market (for transition)
      'https://jamaamarket.com',
      'https://www.jamaamarket.com',
      'https://api.jamaamarket.com',
      // Local development
      'https://localhost:3000',
      'https://localhost:3001',
      'https://localhost:3002',
      'https://127.0.0.1:3000',
      'https://127.0.0.1:3001',
      'https://127.0.0.1:3002',
      // Keep HTTP for local development fallback
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
    ];
    
    // Add production domains when available
    if (process.env.CLIENT_URL) {
      allowedOrigins.push(process.env.CLIENT_URL);
    }
    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL);
    }
    
    // Allow common deployment platforms
    if (origin && (
      origin.includes('.netlify.app') ||
      origin.includes('.vercel.app') ||
      origin.includes('.herokuapp.com') ||
      origin.includes('.railway.app') ||
      origin.includes('.render.com')
    )) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS - origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 hours
};

// Password validation function
const validatePassword = (password) => {
  // At least 8 characters, at least one uppercase letter, one lowercase letter, and one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Password validation message
const getPasswordRequirements = () => {
  return 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number';
};

module.exports = {
  generalLimiter,
  authLimiter,
  apiLimiter,
  strictAuthLimiter,
  uploadLimiter,
  storeManagementLimiter,
  helmetOptions,
  corsOptions,
  validatePassword,
  getPasswordRequirements,
};