/**
 * Verification Code Utility
 * Handles generation, storage, and validation of email verification codes
 */

const { pool } = require('../config/database');
const crypto = require('crypto');

/**
 * Generate a 6-digit verification code
 * @returns {string} - 6-digit code
 */
function generateVerificationCode() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Store verification code in database
 * @param {string} email - User email
 * @param {string} userType - User type ('customer', 'store_owner', 'admin', 'driver')
 * @param {string} code - Verification code
 * @returns {Promise<boolean>} - Success status
 */
async function storeVerificationCode(email, userType, code) {
  try {
    const tableMap = {
      'customer': 'customers',
      'store_owner': 'store_owners',
      'admin': 'admins',
      'driver': 'drivers'
    };

    const tableName = tableMap[userType];
    if (!tableName) {
      throw new Error('Invalid user type');
    }

    // Store code with 15-minute expiration
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    await pool.query(`
      UPDATE ${tableName}
      SET verification_code = $1,
          verification_code_expires = $2,
          email_verified = false
      WHERE email = $3
    `, [code, expiresAt, email]);

    return true;
  } catch (error) {
    console.error('Error storing verification code:', error);
    return false;
  }
}

/**
 * Verify code and mark email as verified
 * @param {string} email - User email
 * @param {string} userType - User type
 * @param {string} code - Verification code to verify
 * @returns {Promise<Object>} - Result with success status and message
 */
async function verifyCode(email, userType, code) {
  try {
    const tableMap = {
      'customer': 'customers',
      'store_owner': 'store_owners',
      'admin': 'admins',
      'driver': 'drivers'
    };

    const tableName = tableMap[userType];
    if (!tableName) {
      return {
        success: false,
        message: 'Invalid user type'
      };
    }

    // Get user with verification code
    const result = await pool.query(`
      SELECT id, email, verification_code, verification_code_expires, email_verified
      FROM ${tableName}
      WHERE email = $1
    `, [email]);

    if (result.rows.length === 0) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    const user = result.rows[0];

    // Check if already verified
    if (user.email_verified) {
      return {
        success: false,
        message: 'Email already verified'
      };
    }

    // Check if code exists
    if (!user.verification_code) {
      return {
        success: false,
        message: 'No verification code found. Please request a new code.'
      };
    }

    // Check if code has expired
    if (new Date() > new Date(user.verification_code_expires)) {
      return {
        success: false,
        message: 'Verification code has expired. Please request a new code.',
        expired: true
      };
    }

    // Verify code matches
    if (user.verification_code !== code) {
      return {
        success: false,
        message: 'Invalid verification code'
      };
    }

    // Mark email as verified and clear verification code
    await pool.query(`
      UPDATE ${tableName}
      SET email_verified = true,
          verification_code = NULL,
          verification_code_expires = NULL
      WHERE email = $1
    `, [email]);

    return {
      success: true,
      message: 'Email verified successfully',
      userId: user.id
    };

  } catch (error) {
    console.error('Error verifying code:', error);
    return {
      success: false,
      message: 'Error verifying code'
    };
  }
}

/**
 * Check if user's email is verified
 * @param {string} email - User email
 * @param {string} userType - User type
 * @returns {Promise<boolean>} - True if verified
 */
async function isEmailVerified(email, userType) {
  try {
    const tableMap = {
      'customer': 'customers',
      'store_owner': 'store_owners',
      'admin': 'admins',
      'driver': 'drivers'
    };

    const tableName = tableMap[userType];
    if (!tableName) {
      return false;
    }

    const result = await pool.query(`
      SELECT email_verified
      FROM ${tableName}
      WHERE email = $1
    `, [email]);

    return result.rows.length > 0 && result.rows[0].email_verified === true;
  } catch (error) {
    console.error('Error checking email verification:', error);
    return false;
  }
}

/**
 * Clear expired verification codes (cleanup function)
 * @returns {Promise<number>} - Number of codes cleared
 */
async function clearExpiredCodes() {
  try {
    const tables = ['customers', 'store_owners', 'admins', 'drivers'];
    let totalCleared = 0;

    for (const table of tables) {
      const result = await pool.query(`
        UPDATE ${table}
        SET verification_code = NULL,
            verification_code_expires = NULL
        WHERE verification_code IS NOT NULL
        AND verification_code_expires < NOW()
      `);
      totalCleared += result.rowCount;
    }

    if (totalCleared > 0) {
      console.log(`🧹 Cleared ${totalCleared} expired verification codes`);
    }

    return totalCleared;
  } catch (error) {
    console.error('Error clearing expired codes:', error);
    return 0;
  }
}

module.exports = {
  generateVerificationCode,
  storeVerificationCode,
  verifyCode,
  isEmailVerified,
  clearExpiredCodes
};
