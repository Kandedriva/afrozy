const { getUserSession, hasReachedSessionLimit, getOldestSession, destroySession } = require('../utils/sessionUtils');
const { getUserById } = require('../utils/auth');
const logger = require('../config/logger');

/**
 * Enhanced session validation middleware with additional security features
 */

/**
 * Middleware to validate session and check for concurrent session limits
 * @param {Object} options - Configuration options
 * @param {number} options.maxSessions - Maximum concurrent sessions per user (default: 5)
 * @param {boolean} options.enforceLimit - Whether to enforce session limits (default: true)
 * @param {boolean} options.checkUserStatus - Whether to check user account status (default: true)
 * @returns {Function} - Express middleware function
 */
function validateSession(options = {}) {
  const {
    maxSessions = 5,
    enforceLimit = true,
    checkUserStatus = true
  } = options;

  return async (req, res, next) => {
    try {
      // Skip validation if no session exists
      if (!req.session || !req.session.userId || !req.session.userType) {
        return next();
      }

      const { userId, userType, email } = req.session;

      // Check if user still exists and is active
      if (checkUserStatus) {
        const user = await getUserById(userId, userType);
        if (!user) {
          req.session.destroy();
          return res.status(401).json({
            success: false,
            message: 'User account not found. Please log in again.'
          });
        }

        // Check user status - different status logic for different user types
        const isUserInactive = userType === 'driver' 
          ? user.status === 'inactive' || !user.is_verified
          : user.status !== 'active';
          
        if (isUserInactive) {
          req.session.destroy();
          return res.status(403).json({
            success: false,
            message: userType === 'driver' 
              ? 'Driver account is inactive or not verified. Please contact support.'
              : 'Account is inactive. Please contact support.'
          });
        }
      }

      // Check for session limit enforcement
      if (enforceLimit) {
        const hasReachedLimit = await hasReachedSessionLimit(userId, userType, maxSessions);
        if (hasReachedLimit) {
          // Get current session from database to verify it exists
          const sessionExists = await getUserSession(userId, userType);
          if (!sessionExists) {
            // Current session doesn't exist in database, destroy local session
            req.session.destroy();
            return res.status(401).json({
              success: false,
              message: 'Session expired. Please log in again.'
            });
          }
        }
      }

      // Update session activity
      req.session.lastActivity = new Date().toISOString();
      req.session.touch();

      // Log session activity for security monitoring
      logger.debug(`Session activity: ${userType} ${userId} (${email}) - ${req.method} ${req.path}`);

      next();
    } catch (error) {
      logger.error('Session validation error:', error);
      
      // Destroy potentially corrupted session
      if (req.session) {
        req.session.destroy();
      }
      
      res.status(500).json({
        success: false,
        message: 'Session validation error. Please log in again.'
      });
    }
  };
}

/**
 * Middleware to enforce single session per user
 * Destroys all other sessions when a new session is created
 */
function enforceSingleSession() {
  return async (req, res, next) => {
    try {
      if (req.session && req.session.userId && req.session.userType && req.session.isNewSession) {
        const { destroyUserSessions } = require('../utils/sessionUtils');
        
        // Destroy all other sessions for this user
        await destroyUserSessions(req.session.userId, req.session.userType);
        
        // Mark this session as no longer new
        delete req.session.isNewSession;
        
        logger.info(`Enforced single session for ${req.session.userType} ${req.session.userId}`);
      }
      
      next();
    } catch (error) {
      logger.error('Single session enforcement error:', error);
      next(); // Don't block the request for this error
    }
  };
}

/**
 * Middleware to track user activity and session metadata
 */
function trackSessionActivity() {
  return (req, res, next) => {
    if (req.session && req.session.userId) {
      // Update session metadata
      req.session.lastActivity = new Date().toISOString();
      req.session.lastIp = req.ip || req.connection.remoteAddress;
      req.session.lastUserAgent = req.get('User-Agent');
      req.session.requestCount = (req.session.requestCount || 0) + 1;
      
      // Track API endpoints accessed
      if (!req.session.accessedEndpoints) {
        req.session.accessedEndpoints = [];
      }
      
      const endpoint = `${req.method} ${req.path}`;
      if (!req.session.accessedEndpoints.includes(endpoint)) {
        req.session.accessedEndpoints.push(endpoint);
        
        // Keep only last 10 endpoints
        if (req.session.accessedEndpoints.length > 10) {
          req.session.accessedEndpoints = req.session.accessedEndpoints.slice(-10);
        }
      }
    }
    
    next();
  };
}

/**
 * Middleware to detect suspicious session activity
 */
function detectSuspiciousActivity() {
  return (req, res, next) => {
    if (req.session && req.session.userId) {
      const currentIp = req.ip || req.connection.remoteAddress;
      const currentUserAgent = req.get('User-Agent');
      
      // Check for IP address changes
      if (req.session.lastIp && req.session.lastIp !== currentIp) {
        logger.warn(`IP address change detected for user ${req.session.userId}: ${req.session.lastIp} -> ${currentIp}`);
        
        // Optionally destroy session on IP change (for high security)
        if (process.env.STRICT_IP_VALIDATION === 'true') {
          req.session.destroy();
          return res.status(401).json({
            success: false,
            message: 'Session terminated due to IP address change. Please log in again.'
          });
        }
      }
      
      // Check for User-Agent changes
      if (req.session.lastUserAgent && req.session.lastUserAgent !== currentUserAgent) {
        logger.warn(`User-Agent change detected for user ${req.session.userId}`);
      }
      
      // Check for rapid requests (potential bot activity)
      const now = Date.now();
      if (!req.session.requestTimes) {
        req.session.requestTimes = [];
      }
      
      req.session.requestTimes.push(now);
      
      // Keep only requests from last minute
      req.session.requestTimes = req.session.requestTimes.filter(time => now - time < 60000);
      
      // Alert if more than 60 requests per minute
      if (req.session.requestTimes.length > 60) {
        logger.warn(`High request rate detected for user ${req.session.userId}: ${req.session.requestTimes.length} requests/minute`);
        
        // Optionally throttle or block
        if (req.session.requestTimes.length > 100) {
          return res.status(429).json({
            success: false,
            message: 'Too many requests. Please slow down.'
          });
        }
      }
    }
    
    next();
  };
}

/**
 * Middleware to handle session limit exceeded scenarios
 */
function handleSessionLimitExceeded() {
  return async (req, res, next) => {
    try {
      if (req.session && req.session.userId && req.session.userType) {
        const { userId, userType } = req.session;
        const maxSessions = 5; // Can be made configurable
        
        const hasReachedLimit = await hasReachedSessionLimit(userId, userType, maxSessions);
        if (hasReachedLimit) {
          // Destroy the oldest session to make room
          const oldestSessionId = await getOldestSession(userId, userType);
          if (oldestSessionId) {
            await destroySession(oldestSessionId);
            logger.info(`Destroyed oldest session for user ${userId} due to session limit`);
          }
        }
      }
      
      next();
    } catch (error) {
      logger.error('Session limit handling error:', error);
      next(); // Don't block the request
    }
  };
}

module.exports = {
  validateSession,
  enforceSingleSession,
  trackSessionActivity,
  detectSuspiciousActivity,
  handleSessionLimitExceeded
};