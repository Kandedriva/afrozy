const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { pool } = require('./database');

// Session configuration
const sessionConfig = {
  store: new pgSession({
    pool: pool,
    tableName: 'user_sessions',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET environment variable is required in production');
    }
    return 'your-super-secret-session-key-change-in-production';
  })(),
  name: 'sessionId',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax' // CSRF protection (lax in dev for cross-port)
  },
  rolling: true // Reset expiry on each request
};

// In production, trust proxy for secure cookies
if (process.env.NODE_ENV === 'production') {
  sessionConfig.proxy = true;
}

module.exports = sessionConfig;