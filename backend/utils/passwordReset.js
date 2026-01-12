const crypto = require('crypto');
const { pool } = require('../config/database');
const logger = require('../config/logger');

/**
 * Generate a secure password reset token
 * @returns {string} - Secure random token
 */
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create password reset token for user
 * @param {string} email - User email
 * @param {string} userType - User type (customer, store_owner, admin)
 * @returns {Object} - Result with token and expiry
 */
async function createPasswordResetToken(email, userType) {
  try {
    const token = generateResetToken();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    // Determine table based on user type
    const tableMap = {
      'customer': 'customers',
      'store_owner': 'store_owners',
      'admin': 'admins'
    };

    const tableName = tableMap[userType];
    if (!tableName) {
      throw new Error('Invalid user type');
    }

    // Store hashed token in database
    const query = `
      UPDATE ${tableName}
      SET
        reset_token = $1,
        reset_token_expires = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE email = $3
      RETURNING id, email, full_name
    `;

    const result = await pool.query(query, [tokenHash, expiresAt, email]);

    if (result.rows.length === 0) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    return {
      success: true,
      token, // Return unhashed token (to be sent via email)
      user: result.rows[0],
      expiresAt
    };

  } catch (error) {
    logger.error('Error creating password reset token:', error);
    throw error;
  }
}

/**
 * Verify password reset token
 * @param {string} token - Reset token from email
 * @returns {Object} - Result with user info if valid
 */
async function verifyResetToken(token) {
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Check all user tables for the token
    const tables = ['customers', 'store_owners', 'admins'];
    const userTypeMap = {
      'customers': 'customer',
      'store_owners': 'store_owner',
      'admins': 'admin'
    };

    for (const table of tables) {
      const query = `
        SELECT id, email, full_name, reset_token_expires
        FROM ${table}
        WHERE reset_token = $1 AND reset_token_expires > NOW()
      `;

      const result = await pool.query(query, [tokenHash]);

      if (result.rows.length > 0) {
        return {
          success: true,
          user: result.rows[0],
          userType: userTypeMap[table]
        };
      }
    }

    return {
      success: false,
      message: 'Invalid or expired reset token'
    };

  } catch (error) {
    logger.error('Error verifying reset token:', error);
    throw error;
  }
}

/**
 * Clear password reset token after successful reset
 * @param {string} email - User email
 * @param {string} userType - User type
 */
async function clearResetToken(email, userType) {
  try {
    const tableMap = {
      'customer': 'customers',
      'store_owner': 'store_owners',
      'admin': 'admins'
    };

    const tableName = tableMap[userType];
    if (!tableName) {
      throw new Error('Invalid user type');
    }

    const query = `
      UPDATE ${tableName}
      SET
        reset_token = NULL,
        reset_token_expires = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE email = $1
    `;

    await pool.query(query, [email]);
    logger.info(`Reset token cleared for ${email}`);

  } catch (error) {
    logger.error('Error clearing reset token:', error);
    throw error;
  }
}

/**
 * Send password reset email (placeholder - integrate with email service)
 * @param {string} email - Recipient email
 * @param {string} token - Reset token
 * @param {string} fullName - User's full name
 */
async function sendPasswordResetEmail(email, token, fullName) {
  // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  // For now, just log the reset URL

  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

  logger.info(`Password reset email would be sent to ${email}`);
  logger.info(`Reset URL: ${resetUrl}`);

  // In production, replace this with actual email sending:
  /*
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to: email,
    from: process.env.FROM_EMAIL,
    subject: 'Password Reset Request - Afrozy',
    text: `Hello ${fullName},\n\nYou requested to reset your password. Click the link below to reset it:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
    html: `
      <h2>Password Reset Request</h2>
      <p>Hello ${fullName},</p>
      <p>You requested to reset your password. Click the link below to reset it:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  };

  await sgMail.send(msg);
  */

  // For development, you can use console or return the URL
  if (process.env.NODE_ENV === 'development') {
    console.log('\n=================================');
    console.log('PASSWORD RESET EMAIL (DEV MODE)');
    console.log('=================================');
    console.log(`To: ${email}`);
    console.log(`Name: ${fullName}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log('=================================\n');
  }

  return {
    success: true,
    message: 'Password reset email sent',
    ...(process.env.NODE_ENV === 'development' && { resetUrl }) // Include URL in dev mode for testing
  };
}

module.exports = {
  createPasswordResetToken,
  verifyResetToken,
  clearResetToken,
  sendPasswordResetEmail
};
