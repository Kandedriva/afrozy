const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticateUser, createUser, authenticateSession } = require('../utils/auth');
const { pool } = require('../config/database');
const { 
  getUserSessions, 
  destroyUserSessions, 
  destroySession,
  getSessionStats 
} = require('../utils/sessionUtils');

const router = express.Router();

// Validation helper functions
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  // At least 6 characters
  return password && password.length >= 6;
};

// POST /api/auth/register - Register new customer
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, fullName, phone, address } = req.body;

    // Validation
    if (!username || !email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, password, and full name are required'
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists in any table
    const existingUserChecks = await Promise.all([
      pool.query('SELECT id FROM customers WHERE email = $1 OR username = $2', [email, username]),
      pool.query('SELECT id FROM admins WHERE email = $1 OR username = $2', [email, username]),
      pool.query('SELECT id FROM store_owners WHERE email = $1 OR username = $2', [email, username])
    ]);

    const existingUser = existingUserChecks.some(result => result.rows.length > 0);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Create new customer
    const userData = {
      username,
      email,
      full_name: fullName,
      phone: phone || null,
      address: address || null
    };

    const user = await createUser({ ...userData, password }, 'customer');

    // Create session
    req.session.userId = user.id;
    req.session.userType = 'customer';
    req.session.email = user.email;
    req.session.isNewSession = true;
    req.session.loginTime = new Date().toISOString();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
});

// POST /api/auth/login - User login (any type)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Use the authenticateUser utility to handle multi-table authentication
    const authResult = await authenticateUser(email, password);

    if (!authResult.success) {
      return res.status(401).json({
        success: false,
        message: authResult.message
      });
    }

    // Create session
    req.session.userId = authResult.data.user.id;
    req.session.userType = authResult.data.user.user_type;
    req.session.email = authResult.data.user.email;
    req.session.isNewSession = true;
    req.session.loginTime = new Date().toISOString();

    res.json({
      success: true,
      message: authResult.message,
      data: authResult.data
    });

  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
});

// POST /api/auth/logout - User logout (destroy session)
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.status(500).json({
        success: false,
        message: 'Error during logout'
      });
    }
    
    res.clearCookie('connect.sid');
    res.json({
      success: true,
      message: 'Logout successful'
    });
  });
});

// GET /api/auth/profile - Get user profile (requires authentication)
router.get('/profile', authenticateSession(), async (req, res) => {
  try {
    // The authenticateToken middleware already fetches fresh user data
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });

  } catch (error) {
    console.error('Profile fetch error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', authenticateSession(), async (req, res) => {
  try {
    const userId = req.user.userId;
    const userType = req.user.userType;
    const { fullName, phone, address } = req.body;

    if (!fullName) {
      return res.status(400).json({
        success: false,
        message: 'Full name is required'
      });
    }

    const tableMap = {
      'admin': 'admins',
      'customer': 'customers',
      'store_owner': 'store_owners'
    };

    const tableName = tableMap[userType];
    if (!tableName) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type'
      });
    }

    const updateQuery = `
      UPDATE ${tableName} 
      SET full_name = $1, phone = $2, address = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      fullName,
      phone || null,
      address || null,
      userId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];
    delete user.password_hash;
    user.user_type = userType;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Profile update error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/auth/admin/login - Admin login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Use the authenticateUser utility specifically for admins
    const authResult = await authenticateUser(email, password, 'admin');

    if (!authResult.success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    // Create admin session
    req.session.userId = authResult.data.user.id;
    req.session.userType = 'admin';
    req.session.email = authResult.data.user.email;
    req.session.isAdmin = true;
    req.session.isNewSession = true;
    req.session.loginTime = new Date().toISOString();

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        user: authResult.data.user
      }
    });

  } catch (error) {
    console.error('Admin login error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error during admin login'
    });
  }
});

// POST /api/auth/store-owner/register - Store owner registration
router.post('/store-owner/register', async (req, res) => {
  try {
    const { username, email, password, fullName, phone, address, businessName, taxId, businessAddress } = req.body;

    // Validation
    if (!username || !email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, password, and full name are required'
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists in any table
    const existingUserChecks = await Promise.all([
      pool.query('SELECT id FROM customers WHERE email = $1 OR username = $2', [email, username]),
      pool.query('SELECT id FROM admins WHERE email = $1 OR username = $2', [email, username]),
      pool.query('SELECT id FROM store_owners WHERE email = $1 OR username = $2', [email, username])
    ]);

    const existingUser = existingUserChecks.some(result => result.rows.length > 0);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Create new store owner
    const userData = {
      username,
      email,
      full_name: fullName,
      phone: phone || null,
      address: address || null,
      business_name: businessName || null,
      tax_id: taxId || null,
      business_address: businessAddress || null
    };

    const user = await createUser({ ...userData, password }, 'store_owner');

    // Create session
    req.session.userId = user.id;
    req.session.userType = 'store_owner';
    req.session.email = user.email;
    req.session.isNewSession = true;
    req.session.loginTime = new Date().toISOString();

    res.status(201).json({
      success: true,
      message: 'Store owner registered successfully',
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Store owner registration error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
});

// POST /api/auth/store-owner/login - Store owner login
router.post('/store-owner/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Use the authenticateUser utility specifically for store owners
    const authResult = await authenticateUser(email, password, 'store_owner');

    if (!authResult.success) {
      console.log('Store owner auth failed:', {
        email: email,
        message: authResult.message,
        error: authResult.error
      });
      return res.status(401).json({
        success: false,
        message: authResult.message || 'Invalid store owner credentials',
        ...(process.env.NODE_ENV === 'development' && authResult.error && { error: authResult.error })
      });
    }

    // Create session
    req.session.userId = authResult.data.user.id;
    req.session.userType = 'store_owner';
    req.session.email = authResult.data.user.email;
    req.session.isNewSession = true;
    req.session.loginTime = new Date().toISOString();

    res.json({
      success: true,
      message: 'Store owner login successful',
      data: authResult.data
    });

  } catch (error) {
    console.error('Store owner login error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error during store owner login'
    });
  }
});

// GET /api/auth/sessions - Get user sessions
router.get('/sessions', authenticateSession(), async (req, res) => {
  try {
    const { userId, userType } = req.user;
    const sessions = await getUserSessions(userId, userType);

    res.json({
      success: true,
      data: {
        sessions: sessions.map(session => ({
          sessionId: session.sessionId,
          expiresAt: session.expiresAt,
          lastActivity: session.sessionData.lastActivity,
          loginTime: session.sessionData.loginTime,
          lastIp: session.sessionData.lastIp,
          lastUserAgent: session.sessionData.lastUserAgent
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching sessions:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/auth/sessions - Destroy all user sessions (except current)
router.delete('/sessions', authenticateSession(), async (req, res) => {
  try {
    const { userId, userType } = req.user;
    const currentSessionId = req.sessionID;

    // Get all sessions
    const sessions = await getUserSessions(userId, userType);
    
    // Destroy all sessions except current one
    let destroyedCount = 0;
    for (const session of sessions) {
      if (session.sessionId !== currentSessionId) {
        const destroyed = await destroySession(session.sessionId);
        if (destroyed) destroyedCount++;
      }
    }

    res.json({
      success: true,
      message: `${destroyedCount} sessions destroyed`,
      data: {
        destroyedSessions: destroyedCount
      }
    });
  } catch (error) {
    console.error('Error destroying sessions:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/auth/sessions/:sessionId - Destroy specific session
router.delete('/sessions/:sessionId', authenticateSession(), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId, userType } = req.user;

    // Verify the session belongs to the current user
    const userSessions = await getUserSessions(userId, userType);
    const sessionExists = userSessions.some(s => s.sessionId === sessionId);

    if (!sessionExists) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or does not belong to you'
      });
    }

    const destroyed = await destroySession(sessionId);

    if (destroyed) {
      res.json({
        success: true,
        message: 'Session destroyed successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to destroy session'
      });
    }
  } catch (error) {
    console.error('Error destroying session:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/auth/admin/session-stats - Get session statistics (admin only)
router.get('/admin/session-stats', authenticateSession('admin'), async (req, res) => {
  try {
    const stats = await getSessionStats();

    res.json({
      success: true,
      data: {
        stats
      }
    });
  } catch (error) {
    console.error('Error fetching session stats:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Export middleware functions for use in other routes using the utils
const authenticateAdmin = authenticateSession('admin');

module.exports = router;
module.exports.authenticateSession = authenticateSession;
module.exports.authenticateToken = authenticateSession; // Backward compatibility
module.exports.authenticateAdmin = authenticateAdmin;