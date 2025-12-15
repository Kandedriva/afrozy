const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

/**
 * Authenticate a user by email and password across all user types
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} userType - Expected user type ('admin', 'customer', 'store_owner') - optional
 * @returns {Object} - Authentication result with user data
 */
async function authenticateUser(email, password, userType = null) {
  try {
    let user = null;
    let tableName = '';
    let actualUserType = '';

    // If userType is specified, check only that table
    if (userType) {
      const tableMap = {
        'admin': 'admins',
        'customer': 'customers', 
        'store_owner': 'store_owners'
      };
      
      tableName = tableMap[userType];
      if (!tableName) {
        throw new Error('Invalid user type specified');
      }

      const result = await pool.query(
        `SELECT * FROM ${tableName} WHERE email = $1`,
        [email]
      );

      if (result.rows.length > 0) {
        user = result.rows[0];
        actualUserType = userType;
      }
    } else {
      // Check all tables to find the user
      const tables = [
        { name: 'admins', type: 'admin' },
        { name: 'customers', type: 'customer' },
        { name: 'store_owners', type: 'store_owner' }
      ];

      for (const table of tables) {
        const result = await pool.query(
          `SELECT * FROM ${table.name} WHERE email = $1`,
          [email]
        );

        if (result.rows.length > 0) {
          user = result.rows[0];
          tableName = table.name;
          actualUserType = table.type;
          break;
        }
      }
    }

    if (!user) {
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    // Check if user account is active
    if (user.status !== 'active') {
      return {
        success: false,
        message: 'Account is not active. Please contact support.'
      };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    // Update last login timestamp (optional - handle gracefully if column doesn't exist)
    try {
      await pool.query(
        `UPDATE ${tableName} SET last_login = CURRENT_TIMESTAMP WHERE id = $1`,
        [user.id]
      );
    } catch (updateError) {
      console.warn(`Warning: Could not update last_login for ${tableName}:`, updateError.message);
      // Continue execution - this is not critical for authentication
    }

    // Remove password hash from response
    delete user.password_hash;
    user.user_type = actualUserType;

    return {
      success: true,
      message: 'Authentication successful',
      data: {
        user
      }
    };

  } catch (error) {
    console.error('Authentication error details:', {
      message: error.message,
      stack: error.stack,
      email: email,
      userType: userType,
      tableName: tableName
    });
    return {
      success: false,
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    };
  }
}

/**
 * Get user by ID and type
 * @param {number} userId - User ID
 * @param {string} userType - User type ('admin', 'customer', 'store_owner', 'driver')
 * @returns {Object} - User data
 */
async function getUserById(userId, userType) {
  try {
    const tableMap = {
      'admin': 'admins',
      'customer': 'customers',
      'store_owner': 'store_owners',
      'driver': 'drivers'
    };

    const tableName = tableMap[userType];
    if (!tableName) {
      throw new Error('Invalid user type');
    }

    const result = await pool.query(
      `SELECT * FROM ${tableName} WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    delete user.password_hash;
    user.user_type = userType;

    return user;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

/**
 * Create a new user
 * @param {Object} userData - User data
 * @param {string} userType - User type ('admin', 'customer', 'store_owner')
 * @returns {Object} - Created user data
 */
async function createUser(userData, userType) {
  try {
    const { password, ...userFields } = userData;
    
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const tableMap = {
      'admin': 'admins',
      'customer': 'customers',
      'store_owner': 'store_owners'
    };

    const tableName = tableMap[userType];
    if (!tableName) {
      throw new Error('Invalid user type');
    }

    // Build insert query dynamically
    const fields = Object.keys(userFields);
    const values = Object.values(userFields);
    values.push(passwordHash);

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const fieldNames = [...fields, 'password_hash'].join(', ');

    const insertQuery = `
      INSERT INTO ${tableName} (${fieldNames})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await pool.query(insertQuery, values);
    const user = result.rows[0];
    
    delete user.password_hash;
    user.user_type = userType;

    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Session-based authentication middleware
 * @param {string} requiredUserType - Required user type (optional)
 * @returns {Function} - Express middleware function
 */
function authenticateSession(requiredUserType = null) {
  return async (req, res, next) => {
    if (!req.session || !req.session.userId || !req.session.userType) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.'
      });
    }

    try {
      if (requiredUserType && req.session.userType !== requiredUserType) {
        return res.status(403).json({
          success: false,
          message: `${requiredUserType} access required`
        });
      }

      // Get fresh user data
      const user = await getUserById(req.session.userId, req.session.userType);
      
      if (!user) {
        req.session.destroy();
        return res.status(403).json({
          success: false,
          message: 'User not found. Session cleared.'
        });
      }

      // Check if user is still active
      if (user.status !== 'active') {
        req.session.destroy();
        return res.status(403).json({
          success: false,
          message: 'Account is not active. Session cleared.'
        });
      }

      req.user = { userId: req.session.userId, userType: req.session.userType, ...user };
      next();
    } catch (error) {
      console.error('Session authentication error:', error.message);
      req.session.destroy();
      return res.status(500).json({
        success: false,
        message: 'Authentication error. Please log in again.'
      });
    }
  };
}

// Backward compatibility alias
const authenticateToken = authenticateSession;

module.exports = {
  authenticateUser,
  getUserById,
  createUser,
  authenticateSession,
  authenticateToken
};