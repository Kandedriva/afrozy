const { pool } = require('../config/database');

/**
 * Session utilities for managing user sessions
 */

/**
 * Get session information for a user
 * @param {string} userId - User ID
 * @param {string} userType - User type
 * @returns {Object|null} - Session information or null if not found
 */
async function getUserSession(userId, userType) {
  try {
    const query = `
      SELECT sess, expire 
      FROM user_sessions 
      WHERE sess->>'userId' = $1 AND sess->>'userType' = $2
      AND expire > NOW()
    `;
    
    const result = await pool.query(query, [userId, userType]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0].sess;
  } catch (error) {
    console.error('Error getting user session:', error);
    return null;
  }
}

/**
 * Get all active sessions for a user
 * @param {string} userId - User ID
 * @param {string} userType - User type
 * @returns {Array} - Array of active sessions
 */
async function getUserSessions(userId, userType) {
  try {
    const query = `
      SELECT sid, sess, expire 
      FROM user_sessions 
      WHERE sess->>'userId' = $1 AND sess->>'userType' = $2
      AND expire > NOW()
      ORDER BY expire DESC
    `;
    
    const result = await pool.query(query, [userId, userType]);
    
    return result.rows.map(row => ({
      sessionId: row.sid,
      sessionData: row.sess,
      expiresAt: row.expire
    }));
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return [];
  }
}

/**
 * Destroy all sessions for a specific user
 * @param {string} userId - User ID
 * @param {string} userType - User type
 * @returns {number} - Number of sessions destroyed
 */
async function destroyUserSessions(userId, userType) {
  try {
    const query = `
      DELETE FROM user_sessions 
      WHERE sess->>'userId' = $1 AND sess->>'userType' = $2
    `;
    
    const result = await pool.query(query, [userId, userType]);
    return result.rowCount;
  } catch (error) {
    console.error('Error destroying user sessions:', error);
    return 0;
  }
}

/**
 * Destroy a specific session
 * @param {string} sessionId - Session ID
 * @returns {boolean} - True if session was destroyed
 */
async function destroySession(sessionId) {
  try {
    const query = 'DELETE FROM user_sessions WHERE sid = $1';
    const result = await pool.query(query, [sessionId]);
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error destroying session:', error);
    return false;
  }
}

/**
 * Get session statistics
 * @returns {Object} - Session statistics
 */
async function getSessionStats() {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE expire > NOW()) as active_sessions,
        COUNT(*) FILTER (WHERE expire <= NOW()) as expired_sessions,
        COUNT(DISTINCT sess->>'userId') as unique_users,
        COUNT(*) FILTER (WHERE sess->>'userType' = 'admin') as admin_sessions,
        COUNT(*) FILTER (WHERE sess->>'userType' = 'customer') as customer_sessions,
        COUNT(*) FILTER (WHERE sess->>'userType' = 'store_owner') as store_owner_sessions,
        COUNT(*) FILTER (WHERE sess->>'userType' = 'driver') as driver_sessions
      FROM user_sessions
    `;
    
    const result = await pool.query(query);
    return result.rows[0];
  } catch (error) {
    console.error('Error getting session stats:', error);
    return {
      total_sessions: 0,
      active_sessions: 0,
      expired_sessions: 0,
      unique_users: 0,
      admin_sessions: 0,
      customer_sessions: 0,
      store_owner_sessions: 0,
      driver_sessions: 0
    };
  }
}

/**
 * Clean up expired sessions
 * @returns {number} - Number of expired sessions cleaned up
 */
async function cleanupExpiredSessions() {
  try {
    const query = 'DELETE FROM user_sessions WHERE expire <= NOW()';
    const result = await pool.query(query);
    return result.rowCount;
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    return 0;
  }
}

/**
 * Update session data
 * @param {string} sessionId - Session ID
 * @param {Object} sessionData - Updated session data
 * @returns {boolean} - True if session was updated
 */
async function updateSessionData(sessionId, sessionData) {
  try {
    const query = `
      UPDATE user_sessions 
      SET sess = $1 
      WHERE sid = $2 AND expire > NOW()
    `;
    
    const result = await pool.query(query, [JSON.stringify(sessionData), sessionId]);
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error updating session data:', error);
    return false;
  }
}

/**
 * Check if a user has reached the maximum number of concurrent sessions
 * @param {string} userId - User ID
 * @param {string} userType - User type
 * @param {number} maxSessions - Maximum allowed sessions (default: 5)
 * @returns {boolean} - True if user has reached the limit
 */
async function hasReachedSessionLimit(userId, userType, maxSessions = 5) {
  try {
    const sessions = await getUserSessions(userId, userType);
    return sessions.length >= maxSessions;
  } catch (error) {
    console.error('Error checking session limit:', error);
    return false;
  }
}

/**
 * Get the oldest session for a user (for cleanup when limit is reached)
 * @param {string} userId - User ID
 * @param {string} userType - User type
 * @returns {string|null} - Session ID of the oldest session
 */
async function getOldestSession(userId, userType) {
  try {
    const query = `
      SELECT sid 
      FROM user_sessions 
      WHERE sess->>'userId' = $1 AND sess->>'userType' = $2
      AND expire > NOW()
      ORDER BY expire ASC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [userId, userType]);
    return result.rows.length > 0 ? result.rows[0].sid : null;
  } catch (error) {
    console.error('Error getting oldest session:', error);
    return null;
  }
}

module.exports = {
  getUserSession,
  getUserSessions,
  destroyUserSessions,
  destroySession,
  getSessionStats,
  cleanupExpiredSessions,
  updateSessionData,
  hasReachedSessionLimit,
  getOldestSession
};